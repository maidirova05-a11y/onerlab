'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { YANDEX_METRIKA_ID } from '@/lib/yandex-metrika';

declare global {
  interface Window {
    ym?: ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };
  }
}

const TAG_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${YANDEX_METRIKA_ID}`;

/**
 * Yandex.Metrika — the official counter snippet, run from the bundle.
 *
 * Not an inline <script>: the CSP is nonce + 'strict-dynamic', and a script
 * element created here inherits trust from Next's nonce-approved runtime, so
 * script-src needs no new host and no inline exception.
 *
 * Never on /admin: Webvisor records the screen, and the panel lists parents'
 * names and phone numbers.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith('/admin');

  useEffect(() => {
    if (!enabled || document.querySelector(`script[src="${TAG_SRC}"]`)) return;

    const ym: NonNullable<Window['ym']> =
      window.ym ??
      function (...args: unknown[]) {
        (ym.a = ym.a || []).push(args);
      };
    ym.l = Date.now();
    window.ym = ym;

    const script = document.createElement('script');
    script.async = true;
    script.src = TAG_SRC;
    document.head.appendChild(script);

    ym(YANDEX_METRIKA_ID, 'init', {
      ssr: true,
      webvisor: true,
      clickmap: true,
      ecommerce: 'dataLayer',
      referrer: document.referrer,
      url: location.href,
      accurateTrackBounce: true,
      trackLinks: true,
    });
  }, [enabled]);

  if (!enabled) return null;

  return (
    <noscript>
      <div>
        {/* eslint-disable-next-line @next/next/no-img-element -- tracking pixel, not content */}
        <img
          src={`https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`}
          style={{ position: 'absolute', left: '-9999px' }}
          alt=""
        />
      </div>
    </noscript>
  );
}
