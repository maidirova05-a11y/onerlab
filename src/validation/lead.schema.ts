import { z } from 'zod';

import { normalizeKzPhone, sanitizeText } from '@/lib/sanitize';

/**
 * =============================================================================
 * Lead form contract — the SINGLE source of truth for both sides of the wire.
 * =============================================================================
 * The client imports this to give instant feedback; the API route imports the
 * very same schema to decide what to persist. That is what makes client-side
 * validation purely a UX affordance: it can be bypassed with curl, and nothing
 * bad happens, because the server re-runs the identical rules.
 *
 * Every message is Russian because they are rendered directly in the form.
 * =============================================================================
 */

/**
 * Letters (Cyrillic + Latin), spaces, hyphens and apostrophes.
 * Digits and punctuation are rejected so that a name field cannot be used to
 * smuggle a URL or markup into the sales team's CRM.
 */
const NAME_PATTERN = /^[\p{L}][\p{L}\s'’-]*$/u;

/**
 * School names, which are punctuated unlike a person's name: "Гимназия №5",
 * «Мирас», НИШ ФМН, "школа-лицей №2". The set is still an allow-list — no
 * angle brackets, no ampersand, nothing that could carry markup — but it has
 * to admit №, quotes and a slash or the field rejects ordinary answers. The
 * first placeholder I wrote, "Гимназия №5", failed its own validation.
 */
// The lookahead demands at least one letter or digit, so punctuation alone
// ('«»', '---') is rejected, while «Мирас» — which opens with a quote — is not.
const SCHOOL_PATTERN = /^(?=.*[\p{L}\p{N}])[\p{L}\p{N}\s'’«»"№.,()\/-]+$/u;

/** Names, plus digits for the age, plus a few separators. */
const NAME_AGE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\s'’,.()-]*$/u;

/* -------------------------------------------------------------------------- */
/* Marketing attribution                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Characters a UTM value may keep: letters, digits, and the separators ad
 * platforms actually emit (`_`, `-`, `.`, `+`, `|`, `/`, `:`, `%`, `{}` for an
 * unresolved template like `{campaignid}`). Everything else — angle brackets,
 * quotes, backticks, semicolons — is DROPPED rather than failing validation.
 *
 * That asymmetry with the fields above is deliberate. A parent's name is
 * something they typed and can fix; a UTM tag was pasted by whoever set up the
 * ad, and rejecting the LEAD because the ad link is malformed would cost the
 * studio the customer to protect a statistic. So attribution is sanitised to
 * the same allow-list shape, hard-capped to the column width, and never the
 * reason a submission fails.
 */
const UTM_DISALLOWED = /[^\p{L}\p{N}\s_.+|/:%{}()-]/gu;

/** Trimmed, control-free, allow-listed, capped; empty becomes `undefined`. */
const utmValue = z
  .unknown()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const cleaned = sanitizeText(value, 120).replace(UTM_DISALLOWED, '').trim().slice(0, 120);
    return cleaned.length > 0 ? cleaned : undefined;
  })
  .optional();

/**
 * `document.referrer` — kept only when it parses as an http(s) URL. The
 * fragment is dropped (it is never sent by browsers anyway, and a hand-crafted
 * one is the obvious place to smuggle text), and the result is capped to the
 * column width.
 */
const referrerValue = z
  .unknown()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const cleaned = sanitizeText(value, 500);
    if (!cleaned) return undefined;
    try {
      const url = new URL(cleaned);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
      url.hash = '';
      // Credentials in a referrer are nonsense at best and a secret at worst.
      url.username = '';
      url.password = '';
      return url.href.slice(0, 500);
    } catch {
      return undefined;
    }
  })
  .optional();

/**
 * The first path the visitor opened, with its query string — a single-origin
 * path only: it must start with exactly one `/`, carry no backslash (browsers
 * read `/\x` as `//x`), and use only URL-safe characters. Anything else is
 * dropped, not rejected, for the same reason as the UTM values.
 */
const LANDING_PATH_PATTERN = /^\/(?![/\\])[\p{L}\p{N}\-._~!$&'()*+,;=:@/?%#]*$/u;

const landingPathValue = z
  .unknown()
  .transform((value) => {
    if (typeof value !== 'string') return undefined;
    const cleaned = sanitizeText(value, 255);
    return LANDING_PATH_PATTERN.test(cleaned) ? cleaned : undefined;
  })
  .optional();

/**
 * Zod 4 replaced v3's `required_error` with a single `error` callback. This is
 * the same rule: the custom text only when the field is absent; any other
 * failure (a number where a string belongs) keeps Zod's default message.
 */
function requiredError(message: string) {
  return (issue: { input?: unknown }) => (issue.input === undefined ? message : undefined);
}

export const leadFormSchema = z.object({
  /** "Имя родителя" */
  parentName: z
    .string({ error: requiredError('Укажите ваше имя') })
    // Sanitise BEFORE the length checks, otherwise "   " would pass `min(2)`.
    .transform((value) => sanitizeText(value, 80))
    .pipe(
      z
        .string()
        .min(2, 'Имя должно содержать минимум 2 символа')
        .max(80, 'Имя слишком длинное')
        .regex(NAME_PATTERN, 'Имя может содержать только буквы, пробел и дефис'),
    ),

  /** "Имя и возраст ребенка" — one free-text field, e.g. «Алия, 9 лет» */
  childNameAge: z
    .string({ error: requiredError('Укажите имя и возраст ребенка') })
    .transform((value) => sanitizeText(value, 120))
    .pipe(
      z
        .string()
        .min(2, 'Укажите имя и возраст ребенка')
        .max(120, 'Слишком длинное значение')
        .regex(NAME_AGE_PATTERN, 'Допустимы только буквы, цифры и знаки , . ( ) -'),
    ),

  /** "Из какой школы ученик" — required. */
  school: z
    .string({ error: requiredError('Укажите школу') })
    .transform((value) => sanitizeText(value, 120))
    .pipe(
      z
        .string()
        .min(2, 'Укажите школу')
        .max(120, 'Слишком длинное название')
        .regex(SCHOOL_PATTERN, 'Допустимы буквы, цифры и знаки № « » " . , ( ) / -'),
    ),

  /** "Телефон / WhatsApp" — normalised to E.164 as part of validation. */
  phone: z
    .string({ error: requiredError('Укажите номер телефона') })
    .transform((value) => normalizeKzPhone(value))
    .pipe(
      z
        .string({
          error: (issue) =>
            issue.code === 'invalid_type' ? 'Введите номер в формате +7 (7XX) XXX-XX-XX' : undefined,
        })
        .regex(/^\+77\d{9}$/, 'Введите казахстанский номер в формате +7 (7XX) XXX-XX-XX'),
    ),

  /**
   * Consent to the privacy policy. `z.literal(true)` means "false" is a
   * validation failure, not a falsy value that quietly slips through.
   */
  consent: z.literal(true, { error: 'Необходимо согласие на обработку персональных данных' }),

  /**
   * HONEYPOT. Rendered off-screen and hidden from assistive technology, so a
   * human never fills it in — but a naive form-filling bot fills every input it
   * finds. Anything other than an empty string is treated as a bot.
   */
  website: z
    .string()
    .max(0, 'Заявка отклонена')
    .optional()
    .default(''),

  /** Token produced by the Turnstile / reCAPTCHA widget. Verified server-side. */
  captchaToken: z.string().max(4096).optional(),

  /**
   * MARKETING ATTRIBUTION — filled in by the form from the URL the visitor
   * arrived on, never typed by the parent. See `lib/attribution.ts`.
   */
  utmSource: utmValue,
  utmMedium: utmValue,
  utmCampaign: utmValue,
  utmContent: utmValue,
  utmTerm: utmValue,
  referrer: referrerValue,
  landingPath: landingPathValue,
});

/** Shape the form component works with (pre-transform). */
export interface LeadFormInput {
  parentName: string;
  childNameAge: string;
  school: string;
  phone: string;
  consent: boolean;
  website?: string;
  captchaToken?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referrer?: string;
  landingPath?: string;
}

/** Shape the server persists (post-transform, normalised). */
export type LeadFormData = z.infer<typeof leadFormSchema>;

/**
 * Flattens Zod issues into `{ fieldName: message }` for direct rendering.
 * Only the FIRST issue per field is kept — showing a user five simultaneous
 * complaints about one input is noise, not help.
 */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !(key in fields)) {
      fields[key] = issue.message;
    }
  }
  return fields;
}
