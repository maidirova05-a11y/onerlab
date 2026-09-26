import type { NextConfig } from 'next';

/**
 * Baseline security headers applied to EVERY response.
 *
 * Note that `Content-Security-Policy` is intentionally NOT set here: it is
 * emitted per-request from `middleware.ts` because it carries a fresh nonce.
 * A static CSP would have to allow `'unsafe-inline'` for scripts, which is the
 * single biggest hole you can leave in a CSP.
 */
const securityHeaders = [
  // Force HTTPS for 2 years, including sub-domains. Browsers refuse to make a
  // plaintext request to this host after the first visit -> kills SSL-strip.
  {
    key: 'Strict-Transport-Security',
    /*
     * Deliberately WITHOUT `preload`, without `includeSubDomains`, and with a
     * short max-age.
     *
     * The strict form was locking visitors out on corporate and guest Wi-Fi.
     * Those networks terminate TLS at an inspection proxy that re-signs traffic
     * with a private CA, and captive portals intercept the first request. On a
     * normal site the browser shows a warning the user can click through; with
     * HSTS in force it refuses to offer that choice at all, so the page is
     * simply unreachable — which is exactly what parents were seeing at work.
     *
     * The cause is the network, not this site (both certificates verify clean
     * from outside). But we can decide whether a failure there is recoverable,
     * and for a lead-generation page it has to be. Plain visitors still get
     * HTTPS enforced; Vercel also 308s every HTTP request up to HTTPS
     * independently of this header.
     *
     * `preload` in particular was a promise we should not have advertised: it
     * is a one-way door, hardcoded into browser binaries and slow to undo.
     */
    value: 'max-age=86400',
  },
  // Never let a browser "guess" a response type. Stops a text/plain upload from
  // being executed as JavaScript.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Legacy clickjacking defence (modern browsers use CSP `frame-ancestors`).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Do not leak the full URL (which may contain anchors/query) to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop every powerful browser feature we do not use.
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()',
  },
  // Isolate this browsing context from cross-origin popups it opens.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
  // Disable legacy Flash/PDF cross-domain policy files.
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Self-contained server bundle for the Docker image (see Dockerfile). Vercel
  // builds leave NEXT_OUTPUT unset and are unaffected.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,

  // Never advertise the framework version — free reconnaissance for an attacker.
  poweredByHeader: false,

  // Fail the production build on type errors / lint errors rather than shipping.
  typescript: { ignoreBuildErrors: false },

  experimental: {
    // Only these server actions origins are trusted (CSRF defence in depth).
    serverActions: { allowedOrigins: [] },
  },

  /*
   * One canonical host.
   *
   * Serving the same pages on both www and the apex splits the ranking signal
   * between two URLs and lets search engines treat one as a duplicate. A 308
   * says which one is real. Declared here rather than in vercel.json because
   * the framework config is what actually owns routing for this project — the
   * vercel.json version was silently ignored.
   */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.onerlab.kz' }],
        destination: 'https://onerlab.kz/:path*',
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        /*
         * Hero media: cache hard and forever.
         *
         * Files in `public/` are served by Next with `max-age=0,
         * must-revalidate`, because their names carry no content hash and it
         * cannot know when they change. For the opening screen that default is
         * expensive twice over: the 2.6 MB video is revalidated on every visit,
         * and the second <video> element (the one inside the logo) cannot reuse
         * the first one's bytes — so the same file is fetched twice on a cold
         * load.
         *
         * These assets are versioned by hand, so the trade is worth it.
         * REPLACING ONE MEANS RENAMING IT — overwriting `studio.mp4` in place
         * will not reach anyone who has already loaded the page.
         */
        source: '/hero/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // Logo artwork — same reasoning, same rename-to-update rule.
        source: '/:file(logo.*\.png|apple-touch-icon\.png)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        // API responses must never be cached by a CDN or the browser.
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, max-age=0, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
