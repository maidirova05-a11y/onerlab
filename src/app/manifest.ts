import type { MetadataRoute } from 'next';

import { meta } from '@/content/site';

/**
 * Web app manifest, served at /manifest.webmanifest.
 *
 * Two reasons it is here, both search-facing rather than "let's be a PWA":
 *
 *   • Lighthouse's SEO/PWA audits — and Google's mobile-friendliness signals —
 *     look for a manifest with a name, a start URL and a maskable icon. It is
 *     one of the last remaining boxes this site did not tick.
 *   • A parent who taps "add to home screen" from a WhatsApp link gets the
 *     brand name and the brand colour instead of a truncated URL and a grey
 *     screenshot, which is the difference between the shortcut surviving on the
 *     home screen and being deleted.
 *
 * `display: 'browser'` on purpose: this is a landing page with outbound links
 * to WhatsApp and Instagram, and a standalone shell would trap those in a
 * chrome-less window with no address bar and no way back.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OnerLab — школа живописи для детей в Астане',
    short_name: 'OnerLab',
    description: meta.description,
    lang: 'ru',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'browser',
    orientation: 'portrait-primary',
    background_color: '#ffffff',
    theme_color: '#FAC90A',
    categories: ['education', 'kids'],
    icons: [
      /*
       * Sizes are the files' REAL intrinsic dimensions, measured, not rounded
       * to the usual 192/512. A manifest that claims a size the bitmap does not
       * have makes Chrome discard the icon and fall back to a screenshot of the
       * page. 484px still clears the >=192px bar installability requires.
       */
      { src: '/logo.png', sizes: '484x484', type: 'image/png', purpose: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  };
}
