import { NextResponse, type NextRequest } from 'next/server';

import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session';
import { CAPTCHA_SCRIPT_ORIGINS } from '@/lib/captcha';
import { adminEnabled, env, isProduction } from '@/lib/env';

/**
 * =============================================================================
 * Edge middleware — per-request Content-Security-Policy with a fresh nonce.
 * =============================================================================
 * Why a nonce instead of a static CSP in `next.config.ts`?
 *
 * Next.js emits inline <script> tags for hydration. A static policy would have
 * to allow `'unsafe-inline'` for scripts, which defeats the entire purpose of a
 * CSP — an injected `<script>alert(document.cookie)</script>` would run.
 *
 * With a nonce, only the scripts Next.js itself stamps with this request's
 * random value execute. Next.js detects the nonce in the CSP request header and
 * applies it to its own tags automatically.
 *
 * TRADE-OFF (deliberate, documented in the README): a nonce is unique per
 * request, so pages served through this middleware are rendered dynamically
 * rather than served from the full-page static cache. For a single landing page
 * this is a negligible cost and a large security win.
 *
 * NOTE: static security headers (HSTS, X-Frame-Options, …) are set in
 * `next.config.ts` — they never change per request, so they do not belong here.
 * =============================================================================
 */

/** Cryptographically random, base64-encoded nonce. */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  // Origins the active CAPTCHA provider needs. When CAPTCHA_PROVIDER is "none"
  // these lists are empty, so the policy stays as tight as possible.
  const captchaOrigins = CAPTCHA_SCRIPT_ORIGINS[env.CAPTCHA_PROVIDER];

  const directives: Record<string, string[]> = {
    // Nothing loads unless a more specific directive allows it.
    'default-src': ["'self'"],

    // 'strict-dynamic' lets a nonce'd script load its own dependencies, which
    // is how Next.js chunk loading works. `https:` is an ignored-by-modern-
    // browsers fallback for clients that do not understand 'strict-dynamic'.
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      'https:',
      ...captchaOrigins,
      // React Refresh / HMR needs eval in development only. Never in prod.
      ...(isProduction ? [] : ["'unsafe-eval'"]),
    ],

    // Tailwind ships a real stylesheet, but Next.js still injects a few inline
    // <style> tags. Inline styles cannot execute JavaScript, so this is a far
    // smaller concession than 'unsafe-inline' on script-src would be.
    'style-src': ["'self'", "'unsafe-inline'"],

    'img-src': ["'self'", 'data:', 'blob:'],

    // The hero footage. Without this, video would fall through to `default-src`
    // — which happens to allow 'self' today, but silently breaks the moment
    // default-src is tightened. Declared explicitly so the dependency is visible.
    'media-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],

    // Where the page is allowed to send XHR/fetch/WebSocket traffic. This is
    // what stops injected code from exfiltrating form data to an attacker host.
    'connect-src': [
      "'self'",
      ...captchaOrigins,
      ...(isProduction ? [] : ['ws:', 'wss:']), // dev HMR socket
    ],

    // The CAPTCHA widget renders inside an iframe.
    'frame-src': ["'self'", ...captchaOrigins],

    // Clickjacking defence — the modern replacement for X-Frame-Options.
    'frame-ancestors': ["'none'"],

    // Blocks <base href="//evil.com"> from re-pointing every relative URL.
    'base-uri': ["'self'"],

    // Forms may only submit back to this origin.
    'form-action': ["'self'"],

    // No Flash / Java / legacy plugins, ever.
    'object-src': ["'none'"],

    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
  };

  const policy = Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  // Silently upgrade any stray http:// sub-resource to https:// in production.
  return isProduction ? `${policy}; upgrade-insecure-requests` : policy;
}

/**
 * Gate for everything under /admin.
 *
 * Runs in middleware so an unauthenticated request is turned away at the edge,
 * before any page renders or any database connection is opened. The session is
 * checked a second time inside each admin route — this layer is about cost and
 * blast radius, not about being the only lock.
 *
 * `/admin/login` is exempt, or there would be no way to obtain a session.
 */
async function guardAdmin(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) return null;
  if (pathname === '/admin/login' || pathname === '/api/admin/session') return null;

  if (!adminEnabled) {
    return pathname.startsWith('/api/')
      ? NextResponse.json({ success: false, error: 'Админ-панель не настроена.' }, { status: 503 })
      : new NextResponse('Admin panel is not configured.', {
          status: 503,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
        });
  }

  const session = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (session) return null;

  // An API caller gets a 401 it can act on; a browser gets sent to the form.
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ success: false, error: 'Требуется вход.' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  // Only the path is preserved, never a full URL from the request — that would
  // turn the login screen into an open redirect.
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const blocked = await guardAdmin(request);
  if (blocked) return blocked;

  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // Next.js reads the nonce out of the CSP on the *request* headers and stamps
  // it onto the script tags it renders — this is the documented integration.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  // And the same policy goes out on the response for the browser to enforce.
  response.headers.set('content-security-policy', csp);

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT static assets and the image optimiser — those
     * are served straight from the cache/CDN and a per-request nonce on them
     * would be both pointless and a cache-buster.
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff|woff2)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
