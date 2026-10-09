import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';

import { YandexMetrika } from '@/components/analytics/YandexMetrika';
import { JsonLd } from '@/components/seo/JsonLd';
import { BrushLayer } from '@/components/ui/BrushLayer';
import { PaintField } from '@/components/ui/PaintField';

import { meta } from '@/content/site';
import { env } from '@/lib/env';
import { siteGraph } from '@/lib/seo/structured-data';

import './globals.css';

/**
 * Self-hosted at build time by `next/font` — the files are served from our own
 * origin, so there is no request to fonts.googleapis.com at runtime. That keeps
 * the CSP tight (no third-party font host to allow), removes a render-blocking
 * round trip, and means no visitor data is handed to Google on page load.
 * Both families ship a Cyrillic subset, which is non-negotiable here.
 */
const inter = Inter({
  subsets: ['cyrillic', 'latin'],
  variable: '--font-inter',
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['cyrillic', 'latin'],
  weight: ['700', '800'],
  variable: '--font-manrope',
  display: 'swap',
});

/**
 * Required by the per-request CSP nonce that `middleware.ts` issues.
 *
 * Next.js reads the nonce out of the incoming request's CSP header and stamps
 * it onto every script tag it emits — but it can only do that while actually
 * rendering a request. A statically prerendered page would either carry one
 * nonce baked in at build time for every visitor (worthless), or none at all,
 * and with `'strict-dynamic'` in the policy the browser would then block the
 * entire bundle.
 *
 * Declared explicitly rather than induced as a side effect of calling
 * `headers()`, so that the reason is visible and nobody "optimises" the call
 * away later.
 *
 * COST: no full-page static cache. Acceptable here — every section is a Server
 * Component with no data fetching, so a render is pure string assembly. See
 * README, "Why the page is dynamically rendered".
 */
export const dynamic = 'force-dynamic';

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: meta.title,
    template: '%s | OnerLab',
  },
  description: meta.description,
  keywords: [...meta.keywords],
  applicationName: 'OnerLab',
  authors: [{ name: 'OnerLab' }],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: siteUrl,
    siteName: 'OnerLab',
    title: meta.title,
    description: meta.description,
    /*
     * A purpose-built 1200x630 card, not the square logo.
     *
     * This is the single highest-leverage SEO/social asset for this business:
     * parents share the link in WhatsApp and Instagram DMs, and a square logo
     * renders there as a thumbnail next to bare text. The card carries the
     * offer — what it is, where, and the trial price — so the preview sells
     * before anyone taps.
     */
    images: [
      { url: '/og-image.jpg', width: 1200, height: 630, alt: 'OnerLab — школа живописи для детей в Астане', type: 'image/jpeg' },
    ],
  },
  twitter: {
    // large image, not the small square 'summary' card
    card: 'summary_large_image',
    title: meta.title,
    description: meta.description,
    images: ['/og-image.jpg'],
  },
  /*
   * The "ö" mark on the brand yellow, not the full wordmark: at 16px "öner lab"
   * was an unreadable grey smudge. /favicon.ico is also what Yandex and older
   * browsers fetch without reading these tags.
   */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  formatDetection: { telephone: true },

  /*
   * Ownership proof for the two consoles that matter here. Emitted only when
   * the token is present, so an unconfigured deploy does not ship an empty
   * <meta> that Yandex reads as a failed verification.
   *
   * `other` is used for Yandex because next/metadata has no first-class field
   * for it — Google, Bing and Yahoo do have one.
   */
  verification: {
    ...(env.GOOGLE_SITE_VERIFICATION ? { google: env.GOOGLE_SITE_VERIFICATION } : {}),
    ...(env.YANDEX_SITE_VERIFICATION
      ? { other: { 'yandex-verification': env.YANDEX_SITE_VERIFICATION } }
      : {}),
  },
};

export const viewport: Viewport = {
  themeColor: '#FAC90A',
  width: 'device-width',
  initialScale: 1,
  // Never block pinch-zoom: capping user-scalable is an accessibility failure.
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      {/*
        `relative` is what lets <PaintField> stretch over the whole document:
        it is the positioned ancestor the field's `absolute inset-0` resolves
        against, so the field is exactly as tall as the page.
      */}
      <body className="relative min-h-dvh bg-canvas antialiased">
        {/* Keyboard users can jump straight past the header navigation. */}
        <a
          href="#main"
          className="sr-only-focusable absolute left-4 top-4 z-[100] rounded-pill bg-ink px-5 py-3 text-sm font-bold text-white"
        >
          Перейти к содержимому
        </a>

        {/* Decorative background, behind everything. Scrolls with the page. */}
        <PaintField />

        {/*
          The brush, now site-wide rather than hero-only.

          Deliberately ABOVE the content and blended with `multiply`, which is
          what makes one fixed layer work over every section. Sitting below the
          content instead would mean any section with a background of its own
          hides the stroke — and multiply can only darken, so dark text stays
          exactly as legible as it was while the paint reads properly over the
          light surfaces.

          `fixed` keeps it in viewport coordinates, which is the right frame for
          a cursor trail. It must stay a direct child of <body>: a `transform`
          or `filter` on any ancestor would make that ancestor the containing
          block and pin the canvas to the page instead of the viewport.
        */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-40 opacity-70 mix-blend-multiply"
        >
          <BrushLayer />
        </div>

        {/* Content sits above both decorative layers. */}
        <div className="relative z-10">{children}</div>

        {/*
          SITE-WIDE structured data only: who runs this site (the studio) and
          what the site is. Everything that is true of ONE page — its WebPage
          node, its breadcrumb, the FAQ, the gallery — is emitted by that page
          instead. See the header of `lib/seo/structured-data.ts` for why:
          emitting the FAQ from here put ten questions in the markup of
          /privacy, a page that shows none of them.
        */}
        <JsonLd data={siteGraph()} />

        {/* Skips /admin itself — see the component. */}
        <YandexMetrika />
      </body>
    </html>
  );
}
