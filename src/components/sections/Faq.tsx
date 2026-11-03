import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { faq } from '@/content/site';

/**
 * «Частые вопросы».
 *
 * Native <details>/<summary>, not a JavaScript accordion. Three reasons, and
 * the third is the one that matters for search:
 *
 *   1. It works with zero client JS — no hydration cost on a page that already
 *      carries a video.
 *   2. Keyboard and screen-reader behaviour is the browser's, so it is correct
 *      by default rather than by our re-implementation.
 *   3. THE ANSWERS ARE IN THE HTML whether open or shut. A crawler reads all of
 *      it, and Google requires FAQPage answers to be present in the markup to
 *      show them as rich results. A JS accordion that mounts answers on click
 *      would ship an empty section to the bot.
 *
 * The matching FAQPage structured data is emitted by `app/page.tsx` via
 * `lib/seo/structured-data.ts`, generated from this same `faq.items`, so the
 * two can never drift apart — which is exactly the mismatch Google penalises.
 */
export function Faq() {
  return (
    <section id="faq" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container>
        <SectionHeading
          label={faq.sectionLabel}
          title={faq.title}
          subtitle={faq.subtitle}
          align="center"
        />

        <div className="mx-auto mt-12 max-w-3xl">
          {faq.items.map((item, index) => (
            <Reveal key={item.q} delay={Math.min(index, 4) * 60}>
              <details
                className="group border-b border-line py-1 [&[open]]:bg-canvas-alt/40"
                // The first answer is open on arrival: an accordion where every
                // row is shut reads as an empty block, and the price question
                // is the one nearly everyone came to check.
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-1 py-4 text-left text-base font-semibold text-ink transition-colors hover:text-ink-soft sm:text-lg [&::-webkit-details-marker]:hidden">
                  {/* h3 keeps the outline sane: h2 for the section, h3 per question. */}
                  <h3 className="text-base font-semibold sm:text-lg">{item.q}</h3>

                  <span
                    aria-hidden
                    className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-muted transition-transform duration-300 ease-paint group-open:rotate-45 group-open:border-brand group-open:text-ink"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </span>
                </summary>

                <p className="px-1 pb-5 text-sm leading-relaxed text-ink-soft sm:text-base">
                  {item.a}
                </p>
              </details>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
