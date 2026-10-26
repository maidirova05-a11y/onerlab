-- Admin list default view: newest first with no status filter. The existing
-- (status, createdAt) index cannot serve an unfiltered ORDER BY "createdAt".
-- CreateIndex
CREATE INDEX IF NOT EXISTS "leads_createdAt_idx" ON "leads"("createdAt" DESC);

-- Rate-limit prune (DELETE ... WHERE hit_at < now() - 1 day). BRIN, because rows
-- arrive in hit_at order. IF NOT EXISTS: src/lib/rate-limit.ts applies the same
-- statement on first use (the Vercel build does not run migrations).
-- CreateIndex
CREATE INDEX IF NOT EXISTS "rate_limit_hits_hit_at_idx" ON "rate_limit_hits" USING BRIN ("hit_at");
