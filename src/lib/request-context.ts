import { createHash } from 'node:crypto';

import { allowedOrigins, env, isProduction } from '@/lib/env';

/**
 * =============================================================================
 * Request inspection helpers (server-side only — imports node:crypto).
 * =============================================================================
 */

/**
 * Best-effort client IP.
 *
 * IMPORTANT: `X-Forwarded-For` is attacker-controlled unless a trusted proxy
 * overwrites it. We therefore prefer the platform-provided headers that Vercel
 * / Cloudflare set *themselves* and only fall back to XFF's left-most entry.
 * If you deploy behind your own nginx, make sure it does
 * `proxy_set_header X-Forwarded-For $remote_addr;` (overwrite, not append),
 * otherwise a client can spoof this value to dodge the rate limiter.
 */
export function getClientIp(request: Request): string | null {
  const headers = request.headers;

  const trusted =
    headers.get('cf-connecting-ip') ?? // Cloudflare
    headers.get('x-real-ip') ?? // nginx
    headers.get('x-vercel-forwarded-for'); // Vercel

  if (trusted) return trusted.trim();

  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0];
    if (first) return first.trim();
  }

  return null;
}

/**
 * Salted SHA-256 of the client IP.
 *
 * We want per-visitor abuse forensics without keeping a directly identifying
 * network address in the database. The salt is the app secret (DATABASE_URL is
 * reused here only as an already-present high-entropy value), which stops an
 * attacker who steals a DB dump from simply rainbow-tabling the IPv4 space.
 */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash('sha256').update(`${env.DATABASE_URL}:${ip}`).digest('hex');
}

/**
 * Rate-limit key. Falls back to a coarse bucket when no IP is available so that
 * an unidentifiable client is still throttled rather than unlimited.
 */
export function getRateLimitKey(request: Request): string {
  return getClientIp(request) ?? 'unknown-ip';
}

/**
 * Strict same-origin check for state-changing requests.
 *
 * This is the CSRF control for `POST /api/leads`. Browsers always attach
 * `Origin` to cross-origin POSTs and cannot be told to forge it, so an
 * allow-list on `Origin` blocks a form on `evil.com` from posting here — even
 * though this endpoint is otherwise unauthenticated.
 */
export function isOriginAllowed(request: Request): boolean {
  const origin = request.headers.get('origin');

  // Same-origin fetches from some browsers, and server-to-server calls, omit
  // `Origin`. We fall back to `Referer`, then allow only in development.
  if (!origin) {
    const referer = request.headers.get('referer');
    if (referer) {
      try {
        return allowedOrigins.includes(new URL(referer).origin);
      } catch {
        return false;
      }
    }
    return !isProduction;
  }

  return allowedOrigins.includes(origin.replace(/\/+$/, ''));
}

/**
 * CORS headers for an allowed origin.
 *
 * Note the deliberate absence of a wildcard: `Access-Control-Allow-Origin: *`
 * would let any site on the internet read this API's responses. We echo back
 * only an origin that is already on the allow-list, and add `Vary: Origin` so a
 * CDN never serves one origin's CORS response to another.
 */
export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
    return { Vary: 'Origin' };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Truncated User-Agent, safe to persist. */
export function getUserAgent(request: Request): string | null {
  const userAgent = request.headers.get('user-agent');
  return userAgent ? userAgent.slice(0, 255) : null;
}
