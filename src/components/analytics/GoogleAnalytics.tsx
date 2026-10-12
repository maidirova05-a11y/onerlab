'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { GOOGLE_ANALYTICS_ID } from '@/lib/google-analytics';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const TAG_SRC = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`;

/**
 * Google Analytics 4 — the official gtag.js snippet, run from the bundle.
 *
 * Same reasoning as YandexMetrika: under the nonce + 'strict-dynamic' CSP a
 * script element created here inherits trust from Next's nonce-approved
 * runtime, so script-src needs no new host and no inline exception.
 *
 * Never on /admin: the panel lists parents' names and phone numbers.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const enabled = !pathname.startsWith('/admin');

  useEffect(() => {
    if (!enabled || document.querySelector(`script[src="${TAG_SRC}"]`)) return;

    window.dataLayer = window.dataLayer || [];
    // gtag.js reads the `arguments` object itself, not an array copy of it.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', GOOGLE_ANALYTICS_ID);

    const script = document.createElement('script');
    script.async = true;
    script.src = TAG_SRC;
    document.head.appendChild(script);
  }, [enabled]);

  return null;
}
