/**
 * =============================================================================
 * Shared scroll-reveal controller (client-only).
 * =============================================================================
 * Two problems this solves that a per-component IntersectionObserver does not:
 *
 * 1. CONTENT MUST NEVER STAY INVISIBLE. The reveal animation starts at
 *    `opacity: 0`, so anything that depends solely on an observer firing is one
 *    quirk away from a blank page. Observed in practice: in a browser context
 *    that is not compositing frames, the observer never reports and the whole
 *    page below the hero stays at zero opacity. A geometry check on scroll —
 *    the pre-IntersectionObserver technique — is the safety net, and it cannot
 *    fail for the same reason.
 *
 * 2. ONE OBSERVER, NOT FORTY. This page has ~38 revealed elements. A shared
 *    observer plus a single rAF-throttled scroll listener is materially cheaper
 *    than 38 of each, and the pending set drains to zero as elements reveal,
 *    after which the listeners are torn down entirely.
 * =============================================================================
 */

type RevealFn = () => void;

const pending = new Map<Element, RevealFn>();

let observer: IntersectionObserver | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let listening = false;

/** Reveal slightly before the element's top edge reaches the viewport bottom. */
const TRIGGER_OFFSET = 40;

/**
 * Trailing throttle for the geometry sweep.
 *
 * Deliberately `setTimeout` and NOT `requestAnimationFrame`: rAF is suspended
 * in exactly the situation this fallback exists for — a page that is not
 * compositing frames — so using it would make the safety net fail whenever it
 * is actually needed. 60 ms is imperceptible for a reveal trigger.
 */
const SWEEP_THROTTLE_MS = 60;

function release(element: Element): void {
  const reveal = pending.get(element);
  if (!reveal) return;
  pending.delete(element);
  observer?.unobserve(element);
  reveal();
}

/** Geometry fallback — reveals anything at or above the viewport bottom edge. */
function sweep(): void {
  timer = null;
  const limit = window.innerHeight - TRIGGER_OFFSET;

  for (const element of [...pending.keys()]) {
    // `top < limit` also catches elements the user has already scrolled past,
    // whose top is negative — those must be visible, not waiting to animate in.
    if (element.getBoundingClientRect().top < limit) release(element);
  }

  if (pending.size === 0) teardown();
}

function schedule(): void {
  if (timer !== null) return;
  timer = setTimeout(sweep, SWEEP_THROTTLE_MS);
}

function setup(): void {
  if (listening) return;
  listening = true;

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) release(entry.target);
        }
      },
      { threshold: 0.12, rootMargin: `0px 0px -${TRIGGER_OFFSET}px 0px` },
    );
  }

  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}

function teardown(): void {
  if (!listening) return;
  listening = false;

  window.removeEventListener('scroll', schedule);
  window.removeEventListener('resize', schedule);
  observer?.disconnect();
  observer = null;

  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

/**
 * Registers an element to be revealed once it scrolls into view.
 * Returns an unsubscribe function for React's cleanup phase.
 */
export function registerReveal(element: Element, reveal: RevealFn): () => void {
  // No JS-capable environment guarantees at all? Reveal immediately.
  if (typeof window === 'undefined') {
    reveal();
    return () => {};
  }

  pending.set(element, reveal);
  setup();
  observer?.observe(element);

  // Check straight away so content already in the first viewport does not wait
  // for a scroll event that may never come.
  schedule();

  return () => {
    pending.delete(element);
    observer?.unobserve(element);
    if (pending.size === 0) teardown();
  };
}
