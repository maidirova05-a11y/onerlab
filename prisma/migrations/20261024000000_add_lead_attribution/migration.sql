-- Marketing attribution on leads: UTM tags, the external referrer and the
-- landing path, captured by the form on the visitor's first page view.
-- All nullable, so existing rows need no backfill and the write path never
-- fails for lack of them.
--
-- IF NOT EXISTS: the Vercel build does not run `prisma migrate deploy`, so the
-- app applies this same statement itself on first use
-- (src/server/db/ensure-schema.ts). Whichever runs first, the other is a no-op.
-- Keep the two in sync.

-- AlterTable
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "landingPath" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "referrer" VARCHAR(500),
ADD COLUMN IF NOT EXISTS "utmCampaign" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmContent" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmMedium" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmSource" VARCHAR(120),
ADD COLUMN IF NOT EXISTS "utmTerm" VARCHAR(120);
