'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { contacts } from '@/content/site';

/**
 * Route-level error boundary.
 *
 * The `error` object Next.js passes to a production client boundary is already
 * stripped to `{ message: 'An error occurred…', digest }` — the real message and
 * stack stay on the server. We deliberately do NOT render `error.message`, and
 * show only the `digest`, which is a correlation id the team can grep for in
 * the server logs without exposing anything about the failure to the visitor.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side breadcrumb only. Server-side logging already happened in Pino.
    console.error('Unhandled UI error', error.digest ?? '(no digest)');
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center bg-canvas py-20">
      <Container size="narrow" className="text-center">
        <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-3xl">
          🎨
        </span>

        <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">Что-то пошло не так</h1>
        <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
          Мы уже знаем о проблеме и скоро её исправим. Попробуйте обновить страницу — или просто
          позвоните нам, мы запишем вас на пробный урок по телефону.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={reset} size="lg">
            Обновить страницу
          </Button>
          <Button href={`tel:${contacts.phoneE164}`} variant="secondary" size="lg">
            {contacts.phoneDisplay}
          </Button>
        </div>

        {error.digest ? (
          <p className="mt-8 text-xs text-ink-faint">Код ошибки: {error.digest}</p>
        ) : null}
      </Container>
    </main>
  );
}
