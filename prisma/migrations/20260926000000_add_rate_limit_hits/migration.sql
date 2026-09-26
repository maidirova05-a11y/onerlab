-- Rate-limit counters shared across serverless instances.
-- IF NOT EXISTS: src/lib/rate-limit.ts creates the same table on first use
-- (the Vercel build does not run `prisma migrate deploy`), so this migration
-- must be a no-op wherever that has already happened.

-- CreateTable
CREATE TABLE IF NOT EXISTS "rate_limit_hits" (
    "id" BIGSERIAL NOT NULL,
    "key_hash" TEXT NOT NULL,
    "hit_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_hits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rate_limit_hits_key_idx" ON "rate_limit_hits"("key_hash", "hit_at" DESC);
