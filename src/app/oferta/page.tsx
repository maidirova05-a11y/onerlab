import type { Metadata } from 'next';
import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Container } from '@/components/ui/Container';
import { JsonLd } from '@/components/seo/JsonLd';
import { oferta } from '@/content/oferta';
import { env } from '@/lib/env';
import { privacyGraph } from '@/lib/seo/structured-data';

const siteUrl = env.NEXT_PUBLIC_SITE_URL;
const PAGE_TITLE = 'Публичная оферта';
const PAGE_DESCRIPTION =
  'Публичная оферта ТОО «AZ GROUP LLC» на оказание платных образовательных услуг: условия, оплата, возврат средств и реквизиты Исполнителя.';

export const metadata: Metadata = {
  alternates: { canonical: '/oferta' },
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    type: 'article',
    locale: 'ru_RU',
    siteName: 'OnerLab',
    url: `${siteUrl}/oferta`,
    title: `${PAGE_TITLE} | OnerLab`,
    description: PAGE_DESCRIPTION,
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'OnerLab — школа живописи для детей в Астане', type: 'image/jpeg' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | OnerLab`,
    description: PAGE_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
};

/**
 * Public offer of AZ GROUP LLC — the same document the AZ GROUP olympiad sites
 * publish. The text lives verbatim in src/content/oferta.ts; this page is only
 * the layout, shared with /privacy.
 */
export default function OfertaPage() {
  return (
    <>
      <Header />

      <main id="main" className="relative pt-28 pb-16 sm:pt-32 sm:pb-20">
        <Container size="narrow">
          <nav aria-label="Хлебные крошки" className="text-sm text-ink-muted">
            <Link href="/" className="font-semibold text-ink-soft transition-colors hover:text-ink">
              Главная
            </Link>
            <span aria-hidden className="mx-2">
              /
            </span>
            <span>{PAGE_TITLE}</span>
          </nav>

          <h1 className="mt-6 text-3xl font-extrabold leading-tight text-ink sm:text-4xl">{oferta.title}</h1>
          <p className="mt-4 text-sm text-ink-muted">Последнее обновление: {oferta.updated}</p>

          <div className="mt-10 space-y-9">
            {oferta.sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-xl font-bold text-ink">{section.title}</h2>
                <div className="mt-3 space-y-3">
                  {section.blocks.map((block) =>
                    typeof block === 'string' ? (
                      <p key={block.slice(0, 32)} className="text-base leading-relaxed text-ink-soft">
                        {block}
                      </p>
                    ) : (
                      <ul
                        key={block[0]}
                        className="list-disc space-y-1 pl-5 text-base leading-relaxed text-ink-soft"
                      >
                        {block.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 rounded-card border border-line bg-canvas-alt p-6">
            <h2 className="text-lg font-bold text-ink">{oferta.details.title}</h2>
            <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              {oferta.details.rows.map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-ink-muted">{row.label}</dt>
                  <dd className="mb-2 font-semibold break-words text-ink sm:mb-0">
                    {row.href ? (
                      <a
                        href={row.href}
                        className="underline underline-offset-2"
                        {...(row.href.startsWith('http') && { target: '_blank', rel: 'noopener noreferrer' })}
                      >
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </main>

      <Footer />

      <JsonLd data={privacyGraph({ title: PAGE_TITLE, description: PAGE_DESCRIPTION, path: '/oferta' })} />
    </>
  );
}
