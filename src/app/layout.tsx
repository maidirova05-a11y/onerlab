import type { Metadata, Viewport } from 'next';
import { Inter, Manrope } from 'next/font/google';

import { BrushLayer } from '@/components/ui/BrushLayer';
import { PaintField } from '@/components/ui/PaintField';

import { contacts, faq, meta } from '@/content/site';
import { env } from '@/lib/env';

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
  icons: {
    icon: [{ url: '/logo.png', type: 'image/png' }],
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

/**
 * JSON-LD so Google can show the academy as a local business with a price,
 * an address and a phone number. Serialised through `JSON.stringify` of a
 * typed object — never string-concatenated with user input — so there is no
 * way to break out of the script tag.
 */
function structuredData() {
  return {
    '@context': 'https://schema.org',
    /*
     * A @graph, not a single node.
     *
     * Two separate things need describing: the studio (an entity Google can put
     * in a local result) and the questions page (which can render as expandable
     * FAQ rows). One object cannot be both, and emitting two <script> blocks
     * risks them disagreeing. A graph states both once, with `@id` so the FAQ
     * can point back at the organisation that answers.
     */
    '@graph': [
      {
        '@id': `${siteUrl}/#organization`,
    /*
     * Two types on purpose. EducationalOrganization describes what the studio
     * IS; LocalBusiness is what Google's local surfaces actually query against
     * for "школа рисования рядом" style searches. Declaring both lets one
     * entity answer both intents.
     */
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    name: 'OnerLab',
    description: meta.description,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    // The wide card, not the square logo — Google prefers >=1200px wide images
    // and will not use a small square for a rich result.
    image: `${siteUrl}/og-image.jpg`,
    priceRange: '5000–21000 ₸',
    currenciesAccepted: 'KZT',
    /* Who the classes are for. Feeds "для детей"/age-qualified queries. */
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
      audienceType: 'Дети 1–8 классов',
    },
    telephone: contacts.phoneE164,
    sameAs: [contacts.instagramUrl],
    address: {
      '@type': 'PostalAddress',
      addressLocality: contacts.city,
      addressCountry: 'KZ',
    },
    areaServed: contacts.city,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Курсы живописи для детей',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Course',
            name: 'Живопись и композиция',
            description:
              'Офлайн-курс живописи для детей 1–8 классов: 1,5 часа, 2 раза в неделю, все материалы включены.',
            provider: { '@id': `${siteUrl}/#organization` },
            inLanguage: 'ru-RU',
            /*
             * Course rich results need a concrete instance, not just a name.
             * Every value here is a fact stated on the page: offline, weekends,
             * twice a week, 1.5 hours.
             */
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'onsite',
              location: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: contacts.city, addressCountry: 'KZ' } },
              courseWorkload: 'PT1H30M',
              courseSchedule: {
                '@type': 'Schedule',
                repeatFrequency: 'P1W',
                repeatCount: 2,
                byDay: ['https://schema.org/Saturday', 'https://schema.org/Sunday'],
                duration: 'PT1H30M',
              },
            },
          },
          price: '21000',
          priceCurrency: 'KZT',
        },
        {
          '@type': 'Offer',
          name: 'Пробный урок',
          price: '5000',
          priceCurrency: 'KZT',
        },
      ],
    },
      },
      {
        /*
         * Generated from the SAME `faq.items` the visible section renders, so
         * the markup and the page can never drift. Google drops FAQ rich
         * results — and can flag the site — when the structured answers do not
         * appear verbatim in the visible HTML.
         */
        '@type': 'FAQPage',
        '@id': `${siteUrl}/#faq`,
        inLanguage: 'ru-RU',
        about: { '@id': `${siteUrl}/#organization` },
        mainEntity: faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
    ],
  };
}

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
          Structured data for Google (organisation, courses, prices).

          No `nonce` prop on purpose. A <script type="application/ld+json"> is a
          DATA BLOCK — the HTML parser returns early when preparing it, so it is
          never executed and CSP's script-src is never consulted for it.

          `suppressHydrationWarning` is required, and the reason is subtle. The
          nonce ends up mismatched no matter what we pass:

            • Server HTML for this tag carries no nonce (verified in the DOM).
            • On the client React applies the nonce it was handed via
              `hydrateRoot({ nonce })` to any <script> it renders.
            • And per the CSP spec the browser blanks the nonce *content
              attribute* right after parsing — keeping the value only on the IDL
              property — so that a CSS attribute selector cannot exfiltrate it.

          So React compares its client-side `nonce="…"` against the DOM's `""`
          and reports a mismatch on every load. The difference is meaningless for
          a data block, so we tell React not to diff this element rather than
          leaving a permanent hydration error in the console.
        */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          // Safe: the argument is a locally-defined object literal, not user data.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </body>
    </html>
  );
}
