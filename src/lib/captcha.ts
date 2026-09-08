import { captchaEnabled, env, isProduction } from '@/lib/env';
import { logger } from '@/lib/logger';

/**
 * =============================================================================
 * Bot protection — Cloudflare Turnstile / Google reCAPTCHA v3.
 * =============================================================================
 * The provider is selected with `CAPTCHA_PROVIDER`, so switching from Turnstile
 * to reCAPTCHA (or turning verification off for local development) needs no
 * code change — only an environment variable.
 *
 * Two rules that are easy to get wrong and are enforced here:
 *
 *   1. The secret key NEVER leaves the server. Only `NEXT_PUBLIC_CAPTCHA_SITE_KEY`
 *      is exposed to the browser.
 *   2. A widget token is only meaningful once it has been verified *server-side*
 *      against the provider. A token present in the request body proves nothing
 *      on its own — a bot can send any string it likes.
 * =============================================================================
 */

const VERIFY_ENDPOINTS = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  recaptcha: 'https://www.google.com/recaptcha/api/siteverify',
} as const;

/** Origins the CSP must allow when a provider is active (see middleware.ts). */
export const CAPTCHA_SCRIPT_ORIGINS: Record<'turnstile' | 'recaptcha' | 'none', string[]> = {
  turnstile: ['https://challenges.cloudflare.com'],
  recaptcha: ['https://www.google.com', 'https://www.gstatic.com'],
  none: [],
};

export interface CaptchaVerification {
  success: boolean;
  /** reCAPTCHA v3 only — 0.0 (bot) … 1.0 (human). */
  score?: number;
  /** Provider-side error identifiers, for logs only. Never sent to the client. */
  errors?: string[];
  /** True when verification was skipped because no provider is configured. */
  skipped?: boolean;
}

/** Abort the outbound verification call rather than hang the request. */
const VERIFY_TIMEOUT_MS = 5_000;

/**
 * Verifies a CAPTCHA token with the configured provider.
 *
 * FAIL-CLOSED in production: if the provider is unreachable we reject the
 * submission rather than wave it through. A brief outage costing a few leads is
 * a better trade than an open door for a spam flood.
 */
export async function verifyCaptcha(
  token: string | undefined,
  clientIp: string | null,
): Promise<CaptchaVerification> {
  if (!captchaEnabled) {
    // Development convenience only — `env.ts` already warns loudly if this
    // state is reached in production.
    if (!isProduction) {
      logger.debug('CAPTCHA verification skipped (no provider configured)');
    }
    return { success: true, skipped: true };
  }

  if (!token || token.length < 8 || token.length > 4096) {
    return { success: false, errors: ['missing-or-malformed-token'] };
  }

  const provider = env.CAPTCHA_PROVIDER as 'turnstile' | 'recaptcha';
  const endpoint = VERIFY_ENDPOINTS[provider];

  const body = new URLSearchParams({
    secret: env.CAPTCHA_SECRET_KEY,
    response: token,
  });
  // Binding the token to the submitting IP stops a token being harvested from
  // one machine and replayed from a bot farm.
  if (clientIp) body.set('remoteip', clientIp);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.error({ status: response.status, provider }, 'CAPTCHA provider returned non-2xx');
      return { success: false, errors: [`provider-http-${response.status}`] };
    }

    const result = (await response.json()) as {
      success?: boolean;
      score?: number;
      'error-codes'?: string[];
    };

    if (!result.success) {
      return { success: false, errors: result['error-codes'] ?? ['provider-rejected'] };
    }

    // reCAPTCHA v3 returns a probability rather than a pass/fail, so the
    // threshold decision is ours to make.
    if (provider === 'recaptcha' && typeof result.score === 'number') {
      if (result.score < env.CAPTCHA_MIN_SCORE) {
        return { success: false, score: result.score, errors: ['score-below-threshold'] };
      }
      return { success: true, score: result.score };
    }

    return { success: true };
  } catch (error) {
    // Network failure or timeout -> fail closed.
    logger.error({ err: error, provider }, 'CAPTCHA verification request failed');
    return { success: false, errors: ['verification-unavailable'] };
  }
}
