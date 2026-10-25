import type { Lead } from '@prisma/client';

/**
 * One short label for where a lead came from, for the admin table.
 *
 * Priority mirrors how reliable each signal is: a UTM pair was set on purpose
 * by whoever placed the ad, the referrer host is what the browser happened to
 * send, and the bare landing path only tells us the parent typed the address
 * or came from somewhere that strips referrers (most messengers). The full
 * detail is kept for the tooltip so the compact column stays compact.
 */
export interface LeadSource {
  /** Compact label for the cell: "instagram / cpc", "google.com", "прямой заход". */
  label: string;
  /** Everything we know, one line each, for `title=`. Empty when nothing is known. */
  details: string[];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

export function leadSource(
  lead: Partial<
    Pick<
      Lead,
      'utmSource' | 'utmMedium' | 'utmCampaign' | 'utmContent' | 'utmTerm' | 'referrer' | 'landingPath'
    >
  >,
): LeadSource {
  const details: string[] = [];
  if (lead.utmSource) details.push(`utm_source: ${lead.utmSource}`);
  if (lead.utmMedium) details.push(`utm_medium: ${lead.utmMedium}`);
  if (lead.utmCampaign) details.push(`utm_campaign: ${lead.utmCampaign}`);
  if (lead.utmContent) details.push(`utm_content: ${lead.utmContent}`);
  if (lead.utmTerm) details.push(`utm_term: ${lead.utmTerm}`);
  if (lead.referrer) details.push(`referrer: ${lead.referrer}`);
  if (lead.landingPath) details.push(`landing: ${lead.landingPath}`);

  if (lead.utmSource) {
    return {
      label: lead.utmMedium ? `${lead.utmSource} / ${lead.utmMedium}` : lead.utmSource,
      details,
    };
  }

  const host = lead.referrer ? hostOf(lead.referrer) : null;
  if (host) return { label: host, details };

  return { label: 'прямой заход', details };
}
