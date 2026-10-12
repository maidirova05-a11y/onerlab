import type { MetadataRoute } from 'next';

import { gallery } from '@/content/site';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL;
  const lastModified = new Date();

  return [
    {
      url: base,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
      /*
       * Image sitemap entries for the gallery.
       *
       * Google Images will not reliably discover these on its own: the panels
       * are `loading="lazy"` inside a GSAP-driven accordion, which is exactly
       * the shape of markup its image crawler is worst at. Listing the files
       * here is the supported way to say "these exist, they are on this page" —
       * and student work is a query parents actually search ("работы детей
       * рисование Астана"), so the traffic is real rather than vanity.
       *
       * Derived from the same `gallery.items` the section renders, so a photo
       * added or removed there can never leave a 404 in the sitemap.
       */
      images: [`${base}/og-image.jpg`, ...gallery.items.map((item) => `${base}${item.image}`)],
    },
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/oferta`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
