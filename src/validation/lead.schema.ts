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

export const leadFormSchema = z.object({
  /** "Имя родителя" */
  parentName: z
    .string({ required_error: 'Укажите ваше имя' })
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
    .string({ required_error: 'Укажите имя и возраст ребенка' })
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
    .string({ required_error: 'Укажите школу' })
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
    .string({ required_error: 'Укажите номер телефона' })
    .transform((value) => normalizeKzPhone(value))
    .pipe(
      z
        .string({ invalid_type_error: 'Введите номер в формате +7 (7XX) XXX-XX-XX' })
        .regex(/^\+77\d{9}$/, 'Введите казахстанский номер в формате +7 (7XX) XXX-XX-XX'),
    ),

  /**
   * Consent to the privacy policy. `z.literal(true)` means "false" is a
   * validation failure, not a falsy value that quietly slips through.
   */
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Необходимо согласие на обработку персональных данных' }),
  }),

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
