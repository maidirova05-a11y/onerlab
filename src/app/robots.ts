import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

/**
 * The API and the admin panel are explicitly disallowed. /admin is password
 * protected anyway, but keeping the login page out of the index avoids
 * advertising that an admin surface exists on this domain.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/admin'] }],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
    host: env.NEXT_PUBLIC_SITE_URL,
  };
}
