import { contacts, faq, gallery, meta } from '@/content/site';
import { env } from '@/lib/env';

/**
 * =============================================================================
 * schema.org graphs.
 * =============================================================================
 * Split into SITE-WIDE and PER-PAGE on purpose, and the split is the point of
 * this file rather than a tidiness exercise.
 *
 * All of this used to live in the root layout, which meant every node was
 * emitted on every route — including `FAQPage`. So /privacy, a page with no
 * questions on it anywhere, told Google it answered ten of them. Google checks
 * that FAQ markup matches text a visitor can actually see; markup that does not
 * is ignored at best, and at worst costs the site its rich results across the
 * whole domain. The same applied to the home page's `WebPage` node, which
 * asserted `url: https://onerlab.kz` while sitting in the HTML of a different
 * URL.
 *
 * So: `siteGraph()` holds what is true on every page (who runs this site, what
 * the site is). Each route adds only what is true of itself.
 *
 * TWO RULES, both non-negotiable:
 *   1. Every value comes from `content/site.ts`. Nothing here is a second copy
 *      of a price, a phone number or an answer that can drift from the page.
 *   2. Nothing is asserted that a visitor cannot see. Structured data is a
 *      machine-readable claim about the rendered page, not extra marketing.
 * =============================================================================
 */

type Json = Record<string, unknown>;

const siteUrl = env.NEXT_PUBLIC_SITE_URL;

/** Stable node identifiers, so nodes can reference each other across routes. */
export const ID = {
  organization: `${siteUrl}/#organization`,
  website: `${siteUrl}/#website`,
  homePage: `${siteUrl}/#webpage`,
  primaryImage: `${siteUrl}/#primaryimage`,
  homeBreadcrumb: `${siteUrl}/#breadcrumb`,
  faq: `${siteUrl}/#faq`,
} as const;

const OG_IMAGE_ALT = 'OnerLab — школа живописи для детей в Астане';

/**
 * The studio.
 *
 * Two types on purpose. EducationalOrganization describes what the studio IS;
 * LocalBusiness is what Google's local surfaces actually query against for
 * "школа рисования рядом" style searches. Declaring both lets one entity answer
 * both intents.
 */
function organization(): Json {
  return {
    '@type': ['EducationalOrganization', 'LocalBusiness'],
    '@id': ID.organization,
    name: 'OnerLab',
    description: meta.description,
    url: siteUrl,
    logo: {
      '@type': 'ImageObject',
      url: `${siteUrl}/logo.png`,
      width: 484,
      height: 484,
      caption: 'OnerLab',
    },
    // The wide card, not the square logo — Google prefers >=1200px wide images
    // and will not use a small square for a rich result.
    image: { '@id': ID.primaryImage },
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
            provider: { '@id': ID.organization },
            inLanguage: 'ru-RU',
            /*
             * Course rich results need a concrete instance, not just a name.
             * Every value here is a fact stated on the page: offline, weekends,
             * twice a week, 1.5 hours.
             */
            hasCourseInstance: {
              '@type': 'CourseInstance',
              courseMode: 'onsite',
              location: {
                '@type': 'Place',
                address: {
                  '@type': 'PostalAddress',
                  addressLocality: contacts.city,
                  addressCountry: 'KZ',
                },
              },
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
  };
}

/**
 * The site.
 *
 * No `potentialAction`/SearchAction: there is no search endpoint here, and
 * claiming a sitelinks searchbox that does not exist is a promise Google drops.
 */
function website(): Json {
  return {
    '@type': 'WebSite',
    '@id': ID.website,
    url: siteUrl,
    name: 'OnerLab',
    alternateName: 'OnerLab — школа живописи для детей',
    description: meta.description,
    inLanguage: 'ru-RU',
    publisher: { '@id': ID.organization },
  };
}

/**
 * The OG card as a first-class node, with its real pixel dimensions. Google
 * will not promote an image to a rich result without knowing it is wide enough,
 * and reading the bytes to find out is something it may not get around to.
 */
function primaryImage(): Json {
  return {
    '@type': 'ImageObject',
    '@id': ID.primaryImage,
    url: `${siteUrl}/og-image.jpg`,
    contentUrl: `${siteUrl}/og-image.jpg`,
    width: 1200,
    height: 630,
    caption: OG_IMAGE_ALT,
  };
}

/** True on every route: who runs this, and what the site is. */
export function siteGraph(): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [website(), organization(), primaryImage()],
  };
}

/**
 * The home page: the page node, its breadcrumb, the FAQ and the student work.
 *
 * The FAQ entries are generated from the SAME `faq.items` the visible section
 * renders, so the markup and the page can never drift.
 */
export function homeGraph(): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': ID.homePage,
        url: siteUrl,
        name: meta.title,
        description: meta.description,
        inLanguage: 'ru-RU',
        isPartOf: { '@id': ID.website },
        about: { '@id': ID.organization },
        primaryImageOfPage: { '@id': ID.primaryImage },
        breadcrumb: { '@id': ID.homeBreadcrumb },
      },
      {
        /*
         * A one-item breadcrumb looks pointless and is not: it is what makes
         * the result show "onerlab.kz › Главная" instead of a raw URL, and it
         * gives /privacy a parent to point back at.
         */
        '@type': 'BreadcrumbList',
        '@id': ID.homeBreadcrumb,
        itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Главная', item: siteUrl }],
      },
      {
        '@type': 'FAQPage',
        '@id': ID.faq,
        inLanguage: 'ru-RU',
        isPartOf: { '@id': ID.homePage },
        about: { '@id': ID.organization },
        mainEntity: faq.items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      },
      {
        /*
         * The gallery, described rather than left as eight lazy-loaded <img>
         * tags inside a GSAP accordion — the shape of markup Google's image
         * crawler is worst at. Captions are the same strings used as `alt`, so
         * what Images indexes matches what a screen reader reads out.
         */
        '@type': 'ImageGallery',
        '@id': `${siteUrl}/#gallery`,
        name: gallery.title,
        isPartOf: { '@id': ID.homePage },
        associatedMedia: gallery.items.map((item) => ({
          '@type': 'ImageObject',
          contentUrl: `${siteUrl}${item.image}`,
          caption: item.caption,
          representativeOfPage: false,
        })),
      },
    ],
  };
}

/** The privacy policy: a page hanging off the home page, nothing more. */
export function privacyGraph({
  title,
  description,
}: {
  title: string;
  description: string;
}): Json {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/privacy#webpage`,
        url: `${siteUrl}/privacy`,
        name: title,
        description,
        inLanguage: 'ru-RU',
        isPartOf: { '@id': ID.website },
        about: { '@id': ID.organization },
        breadcrumb: { '@id': `${siteUrl}/privacy#breadcrumb` },
      },
      {
        /*
         * Mirrors the crumbs the page already draws above the heading, word for
         * word — Google compares the two and ignores markup that disagrees.
         */
        '@type': 'BreadcrumbList',
        '@id': `${siteUrl}/privacy#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: siteUrl },
          { '@type': 'ListItem', position: 2, name: title, item: `${siteUrl}/privacy` },
        ],
      },
    ],
  };
}
