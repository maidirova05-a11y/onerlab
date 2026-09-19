import type { Metadata } from 'next';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Logo } from '@/components/layout/Logo';

/**
 * The response already carries HTTP 404, which is the signal that actually
 * keeps this page out of the index — but two things still needed saying.
 *
 * `title` because without it the page inherits the home page's title template
 * and a soft-404 report in Search Console shows "OnerLab — курсы живописи…"
 * for a URL that does not exist, which is impossible to triage.
 *
 * No `robots` field: Next already emits `<meta name="robots" content="noindex">`
 * for this convention, and adding a second robots tag only gives a crawler two
 * directives to reconcile.
 */
export const metadata: Metadata = {
  title: 'Страница не найдена',
  description:
    'Такой страницы на сайте OnerLab нет. Вернитесь на главную — там курсы живописи для детей в Астане и запись на пробный урок.',
};

/** 404 — kept on-brand so a mistyped URL does not look like a broken site. */
export default function NotFound() {
  return (
    <main className="texture-canvas flex min-h-dvh items-center bg-canvas py-20">
      <Container size="narrow" className="text-center">
        <Logo width={160} className="mx-auto" />

        <p className="mt-10 font-display text-6xl font-extrabold text-brand sm:text-7xl">404</p>
        <h1 className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">Страница не найдена</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
          Похоже, такой страницы у нас нет. Вернитесь на главную — там вся информация о курсах и
          запись на пробный урок.
        </p>

        <Button href="/" size="lg" className="mt-8">
          На главную
        </Button>
      </Container>
    </main>
  );
}
