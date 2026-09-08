/**
 * =============================================================================
 * Input sanitisation helpers.
 * =============================================================================
 * Defence in depth against XSS. React already escapes everything it renders, so
 * a stored `<script>` cannot execute in *this* app — but the leads written here
 * are also read by a CRM, exported to Excel and pasted into WhatsApp. Cleaning
 * on the way IN means the data is safe wherever it ends up, not just here.
 *
 * The strategy is allow-list-shaped: strip invisible characters, collapse
 * whitespace, neutralise HTML-significant characters, and hard-cap the length.
 * =============================================================================
 */

/**
 * Code-point ranges that must never survive into stored data.
 *
 * Expressed as a predicate rather than a regex literal on purpose — a source
 * file containing raw C0 control characters is itself a hazard, and the ranges
 * are far easier to audit written out like this.
 */
function isInvisibleCodePoint(code: number): boolean {
  return (
    code <= 0x1f || // C0 controls (NUL, BEL, ESC …)
    (code >= 0x7f && code <= 0x9f) || // DEL + C1 controls
    (code >= 0x200b && code <= 0x200f) || // zero-width space/joiners, LRM, RLM
    (code >= 0x202a && code <= 0x202e) || // bidi embedding & OVERRIDE ("Trojan Source")
    (code >= 0x2060 && code <= 0x2064) || // word joiner, invisible operators
    (code >= 0x2066 && code <= 0x2069) || // bidi isolates
    code === 0xfeff // BOM / zero-width no-break space
  );
}

/** Real line breaks and tabs are meaningful — they become a plain space. */
function isWhitespaceControl(code: number): boolean {
  return code === 0x09 || code === 0x0a || code === 0x0b || code === 0x0c || code === 0x0d;
}

/**
 * Removes invisible characters. Whitespace controls degrade to a space so that
 * "Айгуль\nПетрова" does not silently become "АйгульПетрова".
 */
function stripInvisible(value: string): string {
  let result = '';
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (isWhitespaceControl(code)) {
      result += ' ';
    } else if (!isInvisibleCodePoint(code)) {
      result += char;
    }
  }
  return result;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

/**
 * Escapes every character that could open an HTML tag or break out of an
 * attribute. Use when a value is interpolated somewhere that does NOT
 * auto-escape (email templates, CSV export, a legacy CRM field).
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"'`/]/g, (char) => HTML_ESCAPES[char] ?? char);
}

/**
 * Normalises free-text input before it is validated and stored.
 *
 * - Unicode-normalises (NFC) so visually identical strings compare equal.
 * - Removes invisible / bidi characters used to hide payloads.
 * - Collapses runs of whitespace to a single space.
 * - Trims and hard-truncates to `maxLength`, which is the real defence against
 *   a multi-megabyte "name" being pushed at the database.
 */
export function sanitizeText(value: unknown, maxLength = 200): string {
  if (typeof value !== 'string') return '';
  return stripInvisible(value.normalize('NFC'))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Strips a phone number down to digits plus a single leading `+`.
 * Everything a user might type as decoration — spaces, dashes, brackets — is
 * discarded before validation, so formatting can never smuggle characters in.
 */
export function sanitizePhone(value: unknown): string {
  if (typeof value !== 'string') return '';
  const cleaned = value.replace(/[^\d+]/g, '');
  // Keep a `+` only when it leads the string.
  return (cleaned.startsWith('+') ? '+' : '') + cleaned.replace(/\+/g, '');
}

/**
 * Converts any Kazakhstan phone spelling into canonical E.164 `+7XXXXXXXXXX`.
 * Accepts `8 700 …`, `7 700 …`, `+7 (700) …` and bare `700 …`; returns `null`
 * when the number cannot be interpreted, which the caller turns into a
 * validation error rather than a silent write of garbage.
 */
export function normalizeKzPhone(value: unknown): string | null {
  const digitsOnly = sanitizePhone(value).replace(/^\+/, '');

  // 8XXXXXXXXXX -> 7XXXXXXXXXX (the domestic trunk prefix used across KZ).
  const national =
    digitsOnly.length === 11 && digitsOnly.startsWith('8') ? `7${digitsOnly.slice(1)}` : digitsOnly;

  // 10 digits starting with 7 means the country code was simply omitted.
  const withCountry = national.length === 10 && national.startsWith('7') ? `7${national}` : national;

  // Kazakhstan mobile numbers are +7 7XX XXX XX XX — country code 7, operator 7.
  if (!/^77\d{9}$/.test(withCountry)) return null;
  return `+${withCountry}`;
}

/**
 * Formats a stored E.164 number back into the local display form
 * `+7 (700) 357-59-49`. Used for the phone shown in the header/footer.
 */
export function formatKzPhone(e164: string): string {
  const match = /^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  if (!match) return e164;
  return `+7 (${match[1]}) ${match[2]}-${match[3]}-${match[4]}`;
}
