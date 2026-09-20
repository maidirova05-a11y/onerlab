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

/**
 * The canonical public origin, resolved before validation.
 *
 * Resolution order, and why each step exists:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — what the operator set. Always wins.
 *
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's PRODUCTION domain, which
 *     Vercel injects into every build and every runtime, including preview
 *     deployments (where it still names the production domain rather than the
 *     preview's own host). This is the step that makes a deploy which forgot
 *     step 1 produce correct canonicals instead of failing the build — or,
 *     worse, silently advertising localhost to Google.
 *
 *     Deliberately NOT `VERCEL_URL`: that is the unique per-deployment host
 *     (onerlab-a1b2c3.vercel.app). Baking it into canonicals, the sitemap and
 *     robots.txt would point search engines at an address that changes on
 *     every single push.
 *
 *  3. localhost — so `npm run dev` works with no .env at all. The guard further
 *     down refuses to let this one reach production.
 *
 * Trailing slashes are stripped here rather than being rejected, because this
 * value is concatenated with paths all over the metadata layer and `//privacy`
 * is a different URL from `/privacy` as far as a crawler is concerned.
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return `https://${vercelProduction.replace(/\/+$/, '')}`;

  return 'http://localhost:3000';
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Prisma reads DATABASE_URL itself, but we validate it here so a malformed
  // string is caught at boot rather than on the first query.
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection URL' }),

  // Unpooled endpoint, read by Prisma's `directUrl` for migrations only. The
  // app never opens it at runtime, so it is optional — a deployment that only
  // serves traffic does not need it.
  DIRECT_URL: z.string().url().optional().or(z.literal('')).default(''),

  NEXT_PUBLIC_SITE_URL: z.string().url(),
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
  NEXT_PUBLIC_SITE_URL: resolveSiteUrl(),
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
 * Last-resort guard on the canonical origin.
 *
 * `resolveSiteUrl()` above already covers the realistic case: on Vercel the
 * project's production domain is always present, so a deploy that forgot to
 * set NEXT_PUBLIC_SITE_URL still gets a correct origin and the build does not
 * fail. This check exists for the case that fallback cannot cover — production
 * on some other host, with nothing configured at all.
 *
 * It stays a hard error rather than a warning because of what it prevents. The
 * origin is baked into `metadataBase`, every `<link rel="canonical">`, the
 * sitemap, the manifest and robots.txt, all of which are PRERENDERED AT BUILD
 * TIME. Shipping `http://localhost:3000` there hands Google and Yandex a
 * sitemap of dead URLs and a canonical pointing at the visitor's own machine.
 * Nothing about the running site would look wrong; it would simply never
 * appear in search, and undoing that takes weeks of recrawling.
 *
 * A warning would scroll past in a build log. This is the one misconfiguration
 * worth refusing to ship.
 *
 * Echoing the value is safe, unlike the parse error above: this variable is
 * `NEXT_PUBLIC_`, so it already goes out to every visitor.
 */
if (isProduction) {
  const site = env.NEXT_PUBLIC_SITE_URL;
  const { hostname } = new URL(site);
  const isLoopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

  if (!site.startsWith('https://') || isLoopback) {
    throw new Error(
      `[env] Could not determine the public site origin (resolved "${site}"). ` +
        'Set NEXT_PUBLIC_SITE_URL to the https:// origin, e.g. https://onerlab.kz. ' +
        'Canonical URLs, the sitemap, the manifest and robots.txt are built from it, ' +
        'so a wrong value silently keeps the site out of search. ' +
        'On Vercel this is filled in automatically from the project domain.',
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
