import { ArrowRightIcon, CheckIcon, SparkIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { pricing, program } from '@/content/site';

/**
 * «Программа и стоимость».
 *
 * Layout intent: the curriculum sits on the left where a parent reads it, and
 * the price card is pinned on the right (sticky on desktop) so the number and
 * the CTA stay in view for the whole section. Both promotional offers get their
 * own highlighted band underneath — they are the strongest conversion levers on
 * the page, so they are not buried in body copy.
 */
export function Program() {
  return (
    <section id="program" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container size="wide">
        <SectionHeading
          label={program.sectionLabel}
          title={program.title}
          subtitle={program.subtitle}
        />

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          {/* --- Curriculum + format --- */}
          <div className="space-y-8">
            <Reveal>
              <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
                {program.details.map((detail) => (
                  <div key={detail.label} className="bg-canvas p-5">
                    <dt className="text-xs font-bold uppercase tracking-[0.14em] text-ink-muted">
                      {detail.label}
                    </dt>
                    <dd className="mt-1.5 text-base font-bold text-ink">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>

            <Reveal delay={100}>
              <div className="rounded-card border border-line bg-canvas-alt p-6 sm:p-8">
                <h3 className="font-display text-lg font-bold text-ink">Чему научится ребенок</h3>
                <ul className="mt-5 space-y-3.5">
                  {program.curriculum.map((topic) => (
                    <li key={topic} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                        <CheckIcon className="h-3 w-3 text-ink" />
                      </span>
                      <span className="text-sm leading-relaxed text-ink-soft sm:text-base">
                        {topic}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          {/* --- Price card --- */}
          <Reveal delay={160}>
            <div className="lg:sticky lg:top-28">
              <div className="texture-canvas relative overflow-hidden rounded-card border-2 border-ink bg-canvas p-7 shadow-[0_20px_50px_rgba(51,51,51,0.1)] sm:p-8">
                <span aria-hidden className="paint-blob right-[-25%] top-[-30%] h-52 w-52 bg-brand/35" />

                <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
                  Основной курс
                </p>
                <h3 className="mt-2 font-display text-2xl font-extrabold text-ink">
                  «{program.courseName}»
                </h3>

                <div className="mt-7 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold leading-none text-ink sm:text-5xl">
                    {program.price.amount}
                  </span>
                  <span className="text-sm font-semibold text-ink-muted">{program.price.period}</span>
                </div>

                <p className="mt-3 inline-flex items-center gap-2 rounded-pill bg-brand-soft px-3.5 py-1.5 text-xs font-bold text-ink">
                  <CheckIcon className="h-3.5 w-3.5" />
                  {program.price.note}
                </p>

                <Button href="#signup" size="lg" fullWidth className="mt-8">
                  {program.cta}
                  <ArrowRightIcon className="h-5 w-5" />
                </Button>

                <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted">
                  Начните с пробного урока за {pricing.trialLabel} — без обязательств
                </p>
              </div>
            </div>
          </Reveal>
        </div>

        {/* --- Promotional offers --- */}
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:mt-12">
          {program.offers.map((offer, index) => (
            <Reveal as="li" key={offer.title} delay={index * 90}>
              <article className="relative h-full overflow-hidden rounded-card bg-ink p-6 text-white sm:p-8">
                <span
                  aria-hidden
                  className="paint-blob right-[-18%] bottom-[-40%] h-44 w-44 bg-brand/25"
                />

                <span className="inline-flex items-center gap-2 rounded-pill bg-brand px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-ink">
                  <SparkIcon className="h-3.5 w-3.5" />
                  {offer.badge}
                </span>

                <h3 className="mt-5 font-display text-xl font-extrabold leading-snug sm:text-2xl">
                  {offer.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{offer.description}</p>
              </article>
            </Reveal>
          ))}
        </ul>
      </Container>
    </section>
  );
}
