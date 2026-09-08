import { env } from '@/lib/env';

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
 * SCALING NOTE — this default store is in-process. That is correct for a single
 * Node instance (which is what this landing page needs), but each replica keeps
 * its own counters, so N replicas allow N x the limit. The `RateLimitStore`
 * interface below exists precisely so that swapping in Redis/Upstash for a
 * multi-instance deployment is a one-line change in `createRateLimiter`, with
 * no edit to the route handler. See README "Scaling the rate limiter".
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
 * Survives Next.js dev hot-reload — otherwise every file save would reset the
 * counters and the limiter would be untestable locally.
 */
const globalForRateLimit = globalThis as unknown as { rateLimitStore?: RateLimitStore };

const store: RateLimitStore = globalForRateLimit.rateLimitStore ?? new MemoryRateLimitStore();
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
