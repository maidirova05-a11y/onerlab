import { z } from 'zod';

/**
 * =============================================================================
 * Environment configuration — parsed and validated once, at module load.
 * =============================================================================
 * Rationale: an app that reads `process.env.FOO` inline will happily boot with a
 * typo'd or missing secret and only explode when a real user hits the endpoint.
 * Parsing through Zod here turns that into a startup failure with a readable
 * message, and gives the rest of the codebase a fully typed `env` object.
 *
 * This module is deliberately free of Node-only imports so it can also be
 * evaluated in the Edge runtime (middleware).
 * =============================================================================
 */

/** Comma-separated list -> trimmed, de-duplicated, non-empty array. */
const csvList = z
  .string()
  .optional()
  .transform((value) =>
    Array.from(
      new Set(
        (value ?? '')
          .split(',')
          .map((item) => item.trim().replace(/\/+$/, ''))
          .filter(Boolean),
      ),
    ),
  );

/** "12" -> 12, with a fallback when the variable is absent. */
const numeric = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? fallback : Number(value)))
    .pipe(z.number().int().positive());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Prisma reads DATABASE_URL itself, but we validate it here so a malformed
  // string is caught at boot rather than on the first query.
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection URL' }),

  // Unpooled endpoint, read by Prisma's `directUrl` for migrations only. The
  // app never opens it at runtime, so it is optional — a deployment that only
  // serves traffic does not need it.
  DIRECT_URL: z.string().url().optional().or(z.literal('')).default(''),

  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  ALLOWED_ORIGINS: csvList,

  CAPTCHA_PROVIDER: z.enum(['turnstile', 'recaptcha', 'none']).default('none'),
  NEXT_PUBLIC_CAPTCHA_SITE_KEY: z.string().optional().default(''),
  CAPTCHA_SECRET_KEY: z.string().optional().default(''),
  CAPTCHA_MIN_SCORE: z
    .string()
    .optional()
    .transform((value) => (value === undefined || value === '' ? 0.5 : Number(value)))
    .pipe(z.number().min(0).max(1)),

  RATE_LIMIT_MAX_REQUESTS: numeric(5),
  RATE_LIMIT_WINDOW_MS: numeric(60_000),

  // --- Admin panel -----------------------------------------------------------
  // Both are optional so the public site still boots with no admin configured;
  // the panel then refuses to serve rather than the whole app failing. See the
  // `adminEnabled` guard below.
  //
  // ADMIN_PASSWORD_HASH is a scrypt digest, never the password itself —
  // generate it with `npm run admin:password`.
  ADMIN_PASSWORD_HASH: z.string().optional().default(''),
  ADMIN_SESSION_SECRET: z.string().optional().default(''),
  ADMIN_SESSION_TTL_HOURS: numeric(12),

  // --- Search engine verification --------------------------------------------
  // Ownership tokens from Google Search Console and Yandex Webmaster. Optional:
  // the site indexes without them, but neither console will show impressions,
  // queries or crawl errors until the domain is verified.
  GOOGLE_SITE_VERIFICATION: z.string().optional().default(''),
  YANDEX_SITE_VERIFICATION: z.string().optional().default(''),

  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

/**
 * `process.env` is destructured explicitly rather than passed wholesale.
 * Next.js only inlines statically-referenced `process.env.X` keys into the
 * client bundle, so this pattern is required for NEXT_PUBLIC_* to work at all —
 * and it doubles as an allow-list of what this app is permitted to read.
 */
const parsed = envSchema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  CAPTCHA_PROVIDER: process.env.CAPTCHA_PROVIDER,
  NEXT_PUBLIC_CAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  CAPTCHA_SECRET_KEY: process.env.CAPTCHA_SECRET_KEY,
  CAPTCHA_MIN_SCORE: process.env.CAPTCHA_MIN_SCORE,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  ADMIN_SESSION_TTL_HOURS: process.env.ADMIN_SESSION_TTL_HOURS,
  GOOGLE_SITE_VERIFICATION: process.env.GOOGLE_SITE_VERIFICATION,
  YANDEX_SITE_VERIFICATION: process.env.YANDEX_SITE_VERIFICATION,
  LOG_LEVEL: process.env.LOG_LEVEL,
});

if (!parsed.success) {
  // Only the variable NAMES are printed. Values are never echoed, because this
  // message can end up in a shared build log.
  const invalid = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(
    `[env] Invalid or missing environment variables: ${invalid}. ` +
      `Copy .env.example to .env and fill in the required values.`,
  );
}

export const env = Object.freeze(parsed.data);

export const isProduction = env.NODE_ENV === 'production';
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Every origin the API is allowed to answer for.
 * In development localhost is added so a locally served client still works.
 */
export const allowedOrigins: readonly string[] = Object.freeze(
  Array.from(
    new Set([
      env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, ''),
      ...env.ALLOWED_ORIGINS,
      ...(isProduction ? [] : ['http://localhost:3000', 'http://127.0.0.1:3000']),
    ]),
  ),
);

/**
 * CAPTCHA is only *enforced* when a provider and a secret are both configured.
 * Production refuses to run without it — see the guard below.
 */
export const captchaEnabled = env.CAPTCHA_PROVIDER !== 'none' && env.CAPTCHA_SECRET_KEY.length > 0;

/**
 * The admin panel only serves when BOTH a password hash and a session secret
 * are present. Half-configured is treated as off: a panel that accepts requests
 * without a verifiable password, or signs sessions with an empty key, is worse
 * than one that is simply unavailable.
 */
export const adminEnabled =
  env.ADMIN_PASSWORD_HASH.length > 0 && env.ADMIN_SESSION_SECRET.length > 0;

/**
 * A short secret makes the session signature brute-forceable offline, so this
 * is a hard failure rather than a warning — it would otherwise ship silently.
 */
if (env.ADMIN_SESSION_SECRET.length > 0 && env.ADMIN_SESSION_SECRET.length < 32) {
  throw new Error(
    '[env] ADMIN_SESSION_SECRET must be at least 32 characters. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
  );
}

/**
 * The canonical origin is the one value that, when wrong, breaks the site for
 * search completely and silently.
 *
 * It carries a localhost default so `npm run dev` works with no .env at all.
 * In production that default is a disaster rather than a convenience: the
 * value is baked into `metadataBase`, every `<link rel="canonical">`, the
 * sitemap, the manifest and robots.txt — and all of those are PRERENDERED AT
 * BUILD TIME, because `NEXT_PUBLIC_*` is inlined into the bundle. A deploy
 * that forgot the variable would hand Google and Yandex a sitemap full of
 * `http://localhost:3000/...` and a robots.txt pointing at it. The site could
 * then be neither verified in Search Console nor indexed at all, and nothing
 * about the running page would look wrong.
 *
 * So this is a hard failure at build time, not a warning. There is no useful
 * production behaviour to degrade to, and the failure it prevents is invisible
 * until someone wonders why the site never appeared in search.
 *
 * Echoing the value is safe here, unlike the message above: this variable is
 * `NEXT_PUBLIC_`, so it already ships to every visitor in the client bundle.
 */
if (isProduction) {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const { hostname } = new URL(site);
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!site.startsWith('https://') || isLocal) {
    throw new Error(
      `[env] NEXT_PUBLIC_SITE_URL must be the public https:// origin in production, got "${site}". ` +
        'Canonical URLs, the sitemap, the manifest and robots.txt are all built from it, ' +
        'so a wrong value silently keeps the site out of search.',
    );
  }
}

if (isProduction && !captchaEnabled) {
  // Loud, non-fatal warning: shipping the public form without bot protection is
  // a decision that should be made deliberately, never by accident.
  console.warn(
    '[env] WARNING: running in production with CAPTCHA disabled. ' +
      'Set CAPTCHA_PROVIDER and CAPTCHA_SECRET_KEY before going live.',
  );
}
