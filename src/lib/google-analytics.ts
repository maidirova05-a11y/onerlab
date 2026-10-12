/** Google Analytics 4 measurement ID. No imports: read by both proxy.ts and the client loader. */
export const GOOGLE_ANALYTICS_ID = 'G-8Z4F9JM92Q';

/**
 * Where gtag.js reports hits to. The collection endpoint is regional
 * (region1.google-analytics.com, …analytics.google.com), hence the wildcards;
 * googletagmanager.com is also contacted once the tag has loaded. The same
 * hosts serve the tag's image-beacon fallback.
 */
export const GOOGLE_ANALYTICS_ORIGINS = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://www.googletagmanager.com',
];
