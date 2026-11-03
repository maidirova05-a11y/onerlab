/**
 * Emits one schema.org graph as `<script type="application/ld+json">`.
 *
 * No `nonce` prop on purpose. A `<script type="application/ld+json">` is a DATA
 * BLOCK — the HTML parser returns early when preparing it, so it is never
 * executed and CSP's `script-src` is never consulted for it.
 *
 * `suppressHydrationWarning` is required, and the reason is subtle. The nonce
 * ends up mismatched no matter what we pass:
 *
 *   • Server HTML for this tag carries no nonce (verified in the DOM).
 *   • On the client React applies the nonce it was handed via
 *     `hydrateRoot({ nonce })` to any <script> it renders.
 *   • And per the CSP spec the browser blanks the nonce *content attribute*
 *     right after parsing — keeping the value only on the IDL property — so
 *     that a CSS attribute selector cannot exfiltrate it.
 *
 * So React compares its client-side `nonce="…"` against the DOM's `""` and
 * reports a mismatch on every load. The difference is meaningless for a data
 * block, so we tell React not to diff this element rather than leaving a
 * permanent hydration error in the console.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      // `data` is a locally-built object literal; `<` is escaped anyway so a
      // future string containing "</script>" cannot close the tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}
