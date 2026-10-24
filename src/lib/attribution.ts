/**
 * =============================================================================
 * Marketing attribution — browser side.
 * =============================================================================
 * Answers one question for the studio: WHICH ad, post or search result produced
 * this lead? The form alone cannot tell, because a parent lands from an
 * Instagram ad, scrolls for ten minutes, maybe reloads, and only then submits —
 * by which point the `utm_*` tags are long gone from the address bar.
 *
 * So the tags are captured on the FIRST page view of the tab and kept in
 * `sessionStorage`, which lives exactly as long as that tab. Not localStorage:
 * a parent who came from an ad in March and types the address by hand in May is
 * a new, organic visit, and crediting the old ad would overstate it.
 *
 * Everything here is best-effort. Storage can be unavailable (private mode,
 * blocked site data) or throw, and in every such case the form still submits —
 * attribution is worth less than the lead.
 *
 * This module is client-only (it reads `window`), but imports nothing from the
 * server side, so it can never drag a secret into the bundle.
 * =============================================================================
 */

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  /** `document.referrer` on the landing view, when it is another site. */
  referrer?: string;
  /** Path + query of the landing page, e.g. `/?utm_source=instagram`. */
  landingPath?: string;
}

const STORAGE_KEY = 'onerlab.attribution.v1';

/** URL parameter -> field. Lower-cased lookup, so `UTM_Source` still counts. */
const UTM_PARAMS: Record<string, keyof Attribution> = {
  utm_source: 'utmSource',
  utm_medium: 'utmMedium',
  utm_campaign: 'utmCampaign',
  utm_content: 'utmContent',
  utm_term: 'utmTerm',
};

/** Generous caps; the server re-validates against the column widths anyway. */
const MAX_UTM = 120;
const MAX_REFERRER = 500;
const MAX_PATH = 255;

function readStored(): Attribution | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Attribution) : null;
  } catch {
    return null;
  }
}

function writeStored(value: Attribution): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Quota, private mode, disabled storage — the value lives in memory only.
  }
}

/** Reads what the current URL says, with no storage involved. */
function fromCurrentPage(): Attribution {
  const result: Attribution = {};
  const { location, document } = window;

  const params = new URLSearchParams(location.search);
  for (const [key, value] of params) {
    const field = UTM_PARAMS[key.toLowerCase()];
    if (field && value.trim()) result[field] = value.trim().slice(0, MAX_UTM);
  }

  // Only an EXTERNAL referrer is attribution. A same-origin one just means
  // the parent clicked from /privacy back to the form.
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== location.origin && (ref.protocol === 'http:' || ref.protocol === 'https:')) {
        result.referrer = ref.href.slice(0, MAX_REFERRER);
      }
    } catch {
      // Not a URL — ignore.
    }
  }

  const landing = `${location.pathname}${location.search}`;
  if (landing) result.landingPath = landing.slice(0, MAX_PATH);

  return result;
}

function hasSignal(value: Attribution): boolean {
  return Boolean(
    value.utmSource ||
      value.utmMedium ||
      value.utmCampaign ||
      value.utmContent ||
      value.utmTerm ||
      value.referrer,
  );
}

/**
 * Call once per page load, before the visitor can submit.
 *
 * First visit in this tab: capture the URL and the referrer. Later page views:
 * keep what was stored — UNLESS the new URL carries its own UTM tags, which
 * means the parent clicked a second, different ad, and the newer click is the
 * one that should get the credit.
 */
export function captureAttribution(): Attribution {
  if (typeof window === 'undefined') return {};

  const current = fromCurrentPage();
  const stored = readStored();

  const hasUtmNow = Object.values(UTM_PARAMS).some((field) => Boolean(current[field]));

  if (stored && !hasUtmNow) return stored;
  if (stored && !hasSignal(current)) return stored;

  writeStored(current);
  return current;
}

/**
 * What to send with the lead. Captures on the spot when nothing was stored —
 * the form could have been reached without `captureAttribution` running (a
 * failed effect, storage reset mid-session), and a plain landing path is still
 * worth recording.
 */
export function readAttribution(): Attribution {
  if (typeof window === 'undefined') return {};
  return readStored() ?? captureAttribution();
}
