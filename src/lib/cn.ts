/**
 * Tiny class-name joiner.
 *
 * Deliberately not `clsx` + `tailwind-merge`: this project has a fixed, curated
 * set of components, so two extra dependencies (and their supply-chain surface)
 * for string concatenation is a poor trade.
 *
 * ONE CAVEAT that follows from that choice, and that bit us once already:
 * because nothing here de-duplicates conflicting utilities, a class passed via
 * `className` does NOT reliably override a component's base class from the same
 * property group. Tailwind emits both, they have equal specificity, and the
 * winner is decided by their order in the generated stylesheet — not by the
 * order in the class attribute. Concretely, passing `hidden lg:inline-flex` to
 * `<Button>` loses to the `inline-flex` in its base classes.
 *
 * Rule of thumb: use `className` to ADD (spacing, width, colour accents). To
 * change a property the component already sets — display in particular — wrap
 * the component in a container instead, or add a prop for it.
 */
/** Anything falsy is dropped, so `cond && 'class'` works with any operand type. */
export type ClassValue = string | number | bigint | boolean | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
}
