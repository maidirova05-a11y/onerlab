import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

/**
 * =============================================================================
 * Self-applied schema for the lead attribution columns.
 * =============================================================================
 * The Vercel build deliberately does not run `prisma migrate deploy`, so a push
 * to `main` serves the new code before anyone has run `npm run db:deploy`.
 * Prisma names every model column in its INSERT ... RETURNING and SELECT lists,
 * so until migration 20261024000000_add_lead_attribution is applied both the
 * public form and the admin list would fail with "column does not exist".
 *
 * The app therefore applies the same DDL itself on first use — the precedent is
 * the rate-limit table in src/lib/rate-limit.ts. The statement below is the
 * migration's statement verbatim; both are ADD COLUMN IF NOT EXISTS, so
 * whichever runs first the other is a no-op and `migrate deploy` still records
 * the migration afterwards. Keep the two in sync.
 *
 * The SQL is constant text with no interpolation, so `$executeRawUnsafe` carries
 * no injection surface here.
 * =============================================================================
 */

const ATTRIBUTION_COLUMNS = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmContent',
  'utmTerm',
  'referrer',
  'landingPath',
] as const;

/** Cheap read, so a warm database never takes ALTER TABLE's exclusive lock. */
const COUNT_PRESENT_SQL = `SELECT count(*)::int AS "n" FROM information_schema.columns
  WHERE table_schema = current_schema() AND table_name = 'leads'
  AND column_name IN (${ATTRIBUTION_COLUMNS.map((c) => `'${c}'`).join(', ')})`;

/** Do not queue behind a long transaction and stall every other lead query. */
const LOCK_TIMEOUT_SQL = `SET LOCAL lock_timeout = '5s'`;

/** Identical to prisma/migrations/20261024000000_add_lead_attribution/migration.sql. */
const ADD_COLUMNS_SQL = `ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "landingPath" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "referrer" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "utmCampaign" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmContent" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmMedium" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmSource" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmTerm" VARCHAR(120)`;

let ready: Promise<boolean> | null = null;

async function apply(): Promise<boolean> {
  try {
    const [row] = await prisma.$queryRawUnsafe<{ n: number }[]>(COUNT_PRESENT_SQL);
    if (row?.n === ATTRIBUTION_COLUMNS.length) return true;

    await prisma.$transaction([
      prisma.$executeRawUnsafe(LOCK_TIMEOUT_SQL),
      prisma.$executeRawUnsafe(ADD_COLUMNS_SQL),
    ]);
    logger.info('lead attribution columns added by the app (migration not yet applied)');
    return true;
  } catch (error) {
    // Typically the app role lacks ALTER privilege. Callers fall back to the
    // pre-attribution column set, so leads keep flowing; run `npm run db:deploy`.
    logger.error(
      { err: error },
      'could not ensure lead attribution columns; saving leads without attribution',
    );
    return false;
  }
}

/**
 * Resolves `true` once the attribution columns exist, `false` if they could not
 * be ensured. Never rejects. Memoised per server instance; a failure clears the
 * memo so a later request retries.
 */
export function ensureLeadAttributionColumns(): Promise<boolean> {
  ready ??= apply().then((ok) => {
    if (!ok) ready = null;
    return ok;
  });
  return ready;
}
