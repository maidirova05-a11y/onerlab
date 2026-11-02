# Backend standard

**Layers.** `src/app/api/**/route.ts` (HTTP only: origin, auth, size, rate limit, parse) -> `src/server/services/*` (business rules, transactions) -> Prisma (`src/lib/db.ts`, the only DB access). Routes never touch Prisma directly.

**Validation.** Every request body/query goes through zod (`src/validation/*`, or a local schema for tiny admin bodies). Services receive already-validated data and list fields explicitly (no spreading input into Prisma).

**Responses and errors.** One envelope from `src/lib/http.ts`: `{ success: true, data, requestId }` or `{ success: false, error: { code, message, fields? }, requestId }`. Throw/return `AppError(ErrorCode.X)`; messages come from a fixed catalogue, so internals never leak. Codes map to HTTP status in one table (400 validation, 401 auth, 403 origin/captcha, 404, 409 duplicate, 413, 415, 429, 500, 503 not configured). Every response carries `X-Request-Id` and `Cache-Control: no-store`.

**Auth.** `/admin` and `/api/admin/*` are gated in `src/proxy.ts` and re-checked in each handler (HMAC-signed, HttpOnly, SameSite=Strict cookie). State-changing routes also check `Origin`. Login is limited to 5 attempts / 15 min / IP.

**Rate limiting.** `createRateLimiter(namespace, opts)` in `src/lib/rate-limit.ts`; Postgres-backed (shared across serverless instances) with in-memory fallback. All public writes use it. Client IP comes from platform headers only (see `request-context.ts`; behind your own proxy it must overwrite `X-Forwarded-For`).

**Env.** All variables are parsed once in `src/lib/env.ts` (zod). Never read `process.env` elsewhere. Secrets only from the environment; `.env*` is not committed. Missing required vars fail boot with variable names only.

**Logging.** `pino` via `src/lib/logger.ts` (PII paths redacted); use `requestLogger(requestId, route)` in handlers. Never log phone numbers, passwords, tokens or full IPs.

**Database.** Prisma only, parameterised (tagged `$executeRaw`; the few `*Unsafe` calls run constant DDL). `DATABASE_URL` is pooled, `DIRECT_URL` is for `migrate` only. Pool size is set via the URL (`connection_limit`). Migrations live in `prisma/migrations`, are additive and idempotent (`IF NOT EXISTS`), and are applied with `npm run db:deploy`; never `db push` on a real database. Add an index for every filtered/sorted column and keep the Prisma schema and SQL in sync.

**Health.** `GET /api/health` returns 200 `{status:"ok"}` or 503 `{status:"degraded"}` after a `SELECT 1`.

**Naming.** Files `kebab-case`, services `*.service.ts`, schemas `*.schema.ts`, error codes `UPPER_SNAKE`, routes export `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
