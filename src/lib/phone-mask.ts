/**
 * Progressive input mask for Kazakhstan phone numbers.
 *
 * Formats towards `+7 (7XX) XXX-XX-XX` as the visitor types, but never rejects a
 * keystroke and never fights the caret. A mask that blocks input is worse than
 * no mask at all — and this is not a validation layer: `normalizeKzPhone` plus
 * Zod on the server decide what is actually acceptable.
 *
 * The hard part is that the function is re-applied to its OWN output on every
 * keystroke, and a leading `7` is ambiguous: it can be the country code (which
 * the mask itself rendered a moment ago) or the first digit of the national
 * number. Both readings are resolved below using the fact that every Kazakhstan
 * mobile number is +7 **7**XX XXX XX XX — country code 7, operator digit 7.
 */
export function formatPhoneAsTyped(raw: string): string {
  let digits = raw.replace(/\D/g, '');

  // Step 1: drop the country code. It is either the `7` this mask rendered on
  // the previous keystroke, or an `8`/`7` the visitor typed themselves.
  let strippedCountryCode = false;
  if (digits.startsWith('8') || digits.startsWith('7')) {
    digits = digits.slice(1);
    strippedCountryCode = true;
  }

  // Step 2: a KZ national number always begins with 7. If what remains does
  // not, the digit just removed WAS that leading 7 — put it back. This is what
  // makes a pasted bare "7003575949" read as +7 (700) 357-59-49 instead of
  // +7 (003) 575-94-9, without breaking someone typing "8 700 …" key by key.
  if (strippedCountryCode && digits.length > 0 && !digits.startsWith('7')) {
    digits = `7${digits}`;
  }

  const national = digits.slice(0, 10);
  if (national.length === 0) return '+7 ';

  const operator = national.slice(0, 3);
  const block1 = national.slice(3, 6);
  const block2 = national.slice(6, 8);
  const block3 = national.slice(8, 10);

  let result = `+7 (${operator}`;
  if (national.length >= 3) result += ')';
  if (block1) result += ` ${block1}`;
  if (block2) result += `-${block2}`;
  if (block3) result += `-${block3}`;

  return result;
}
