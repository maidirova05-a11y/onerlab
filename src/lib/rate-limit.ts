import { createHash } from 'node:crypto';

import { prisma } from '@/lib/db';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * =============================================================================
 * Sliding-window rate limiter.
 * =============================================================================
 * Purpose: stop a script from hammering POST /api/leads — both to keep the
 * sales team's CRM free of junk and to stop a trivial application-layer DoS
 * from filling the database.
 *
 * The algorithm is a sliding window over per-key timestamps. Compared to a
 * fixed window it cannot be gamed by firing 2x the quota across a window
 * boundary (5 at 12:00:59 + 5 at 12:01:00 would pass a fixed window).
 *
 * STORAGE — on Vercel every request may land on a fresh function instance, and
 * an in-process Map starts empty on each one: the login limit of 5 per 15 min
 * was really "5 per cold start". Counters therefore live in Postgres (one tiny
 * table, created on first use). If the database is unreachable the limiter
 * falls back to the in-process store rather than failing open or taking the
 * form down.
 * =============================================================================
 */

export interface RateLimitResult {
  /** Whether this request is allowed through. */
  success: boolean;
  /** Configured maximum requests per window. */
  limit: number;
  /** How many requests remain in the current window. */
  remaining: number;
  /** Unix ms at which the window frees up. */
  resetAt: number;
  /** Seconds the client should wait — used for the `Retry-After` header. */
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  /** Records a hit for `key` and reports whether it is within the quota. */
  check(key: string, limit: number, windowMs: number): Promise<RateLimitResult>;
}

/**
 * In-memory store with an upper bound on tracked keys.
 *
 * The `maxKeys` cap matters: without it, an attacker rotating source IPs would
 * grow this map without limit and turn our own anti-abuse control into a memory
 * exhaustion vector.
 */
class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();
  private readonly maxKeys: number;
  private lastSweep = Date.now();

  constructor(maxKeys = 10_000) {
    this.maxKeys = maxKeys;
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    this.sweep(now, windowMs);

    const windowStart = now - windowMs;
    const previous = this.hits.get(key) ?? [];
    // Drop timestamps that have slid out of the window.
    const current = previous.filter((timestamp) => timestamp > windowStart);

    const allowed = current.length < limit;
    if (allowed) current.push(now);

    // Re-inserting moves the key to the end of the Map's iteration order, which
    // gives us cheap approximate-LRU eviction in `sweep`.
    this.hits.delete(key);
    this.hits.set(key, current);

    const oldest = current[0] ?? now;
    const resetAt = oldest + windowMs;

    return {
      success: allowed,
      limit,
      remaining: Math.max(0, limit - current.length),
      resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
    };
  }

  /** Periodically discards expired entries and enforces the key cap. */
  private sweep(now: number, windowMs: number): void {
    if (now - this.lastSweep < windowMs) return;
    this.lastSweep = now;

    const windowStart = now - windowMs;
    for (const [key, timestamps] of this.hits) {
      const live = timestamps.filter((timestamp) => timestamp > windowStart);
      if (live.length === 0) this.hits.delete(key);
      else this.hits.set(key, live);
    }

    // Evict oldest-touched keys if we are still over budget.
    while (this.hits.size > this.maxKeys) {
      const oldestKey = this.hits.keys().next().value;
      if (oldestKey === undefined) break;
      this.hits.delete(oldestKey);
    }
  }
}

/**
 * Postgres-backed store — the one that holds across serverless instances.
 *
 * Keys are hashed before they are written: they contain client IPs, which are
 * personal data, and equality is all the limiter needs.
 *
 * The table is the `RateLimitHit` model (migration 20260926000000). The Vercel
 * build does not run `prisma migrate deploy`, so the same DDL is also applied
 * here on first use; both are IF NOT EXISTS and identical, so neither drifts.
 */
class PostgresRateLimitStore implements RateLimitStore {
  private ready: Promise<unknown> | null = null;

  constructor(private readonly fallback: RateLimitStore) {}

  private ensureTable(): Promise<unknown> {
    this.ready ??= prisma
      .$executeRaw`CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
        "id" BIGSERIAL NOT NULL,
        "key_hash" TEXT NOT NULL,
        "hit_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
      )`
      .then(
        () =>
          prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "rate_limit_hits_key_idx" ON "rate_limit_hits"("key_hash", "hit_at" DESC)`,
      )
      .catch((error: unknown) => {
        this.ready = null;
        throw error;
      });
    return this.ready;
  }

  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const keyHash = createHash('sha256').update(`${env.DATABASE_URL}:${key}`).digest('hex');
    const since = new Date(now - windowMs);

    try {
      await this.ensureTable();
      const where = { keyHash, hitAt: { gt: since } };

      /*
       * Count and insert in ONE transaction, serialised per key.
       *
       * As separate statements the limiter had a race: requests from one IP
       * arriving together all counted the window before any of them had
       * inserted, so all of them passed (measured: 6 of 20 concurrent requests
       * got through a limit of 5). `pg_advisory_xact_lock` on a hash of the key
       * makes the second request wait until the first has committed — the same
       * device `lead.service.ts` uses for the duplicate guard. Transaction-
       * scoped, so the lock is released at COMMIT/ROLLBACK and works through
       * PgBouncer in transaction mode. The limiter holds exactly one lock and
       * requests no other, so it cannot deadlock with the lead transaction, and
       * a `hashtext` collision only means two unrelated keys briefly queue.
       *
       * Tagged `$executeRaw`, so the key travels as a bound parameter.
       */
      const { count, first } = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${keyHash}))`;
        const count = await tx.rateLimitHit.count({ where });
        const first = await tx.rateLimitHit.findFirst({
          where,
          orderBy: { hitAt: 'asc' },
          select: { hitAt: true },
        });
        if (count < limit) await tx.rateLimitHit.create({ data: { keyHash } });
        return { count, first };
      });
      const allowed = count < limit;
      // Occasional cleanup keeps the table to roughly a day of rows.
      if (Math.random() < 0.02) {
        await prisma.rateLimitHit.deleteMany({ where: { hitAt: { lt: new Date(now - 86_400_000) } } });
      }

      const resetAt = (first?.hitAt.getTime() ?? now) + windowMs;
      const used = allowed ? count + 1 : count;
      return {
        success: allowed,
        limit,
        remaining: Math.max(0, limit - used),
        resetAt,
        retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      };
    } catch (error) {
      logger.error(
        { err: error instanceof Error ? error.message : String(error) },
        'rate-limit db unavailable, using memory',
      );
      return this.fallback.check(key, limit, windowMs);
    }
  }
}

/**
 * Survives Next.js dev hot-reload — otherwise every file save would reset the
 * counters and the limiter would be untestable locally.
 */
const globalForRateLimit = globalThis as unknown as { rateLimitStore?: RateLimitStore };

const store: RateLimitStore =
  globalForRateLimit.rateLimitStore ??
  (env.DATABASE_URL ? new PostgresRateLimitStore(new MemoryRateLimitStore()) : new MemoryRateLimitStore());
globalForRateLimit.rateLimitStore = store;

export interface RateLimiter {
  limit(key: string): Promise<RateLimitResult>;
}

/**
 * Builds a limiter bound to a namespace, so two endpoints with different quotas
 * never share counters. Defaults come from validated env
 * (`RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_MS`).
 */
export function createRateLimiter(
  namespace: string,
  options: { max?: number; windowMs?: number } = {},
): RateLimiter {
  const max = options.max ?? env.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs ?? env.RATE_LIMIT_WINDOW_MS;

  return {
    limit: (key: string) => store.check(`${namespace}:${key}`, max, windowMs),
  };
}

/** Standard headers so a well-behaved client can back off on its own. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.success ? {} : { 'Retry-After': String(result.retryAfterSeconds) }),
  };
}
