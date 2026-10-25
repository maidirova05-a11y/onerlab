import { SparkIcon } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { about } from '@/content/site';

/** «О нас» — mission and the three facts a parent checks first. */
export function About() {
  return (
    <section id="about" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container size="wide">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.85fr] lg:items-start lg:gap-16">
          <div>
            <SectionHeading label={about.sectionLabel} title={about.title} />

            <div className="mt-6 space-y-5">
              {about.paragraphs.map((paragraph, index) => (
                <Reveal key={paragraph.slice(0, 24)} delay={80 * (index + 1)}>
                  <p className="text-base leading-relaxed text-ink-soft sm:text-lg">{paragraph}</p>
                </Reveal>
              ))}
            </div>
          </div>

          {/* Mission card — the one place the brand promise is stated plainly. */}
          <Reveal delay={160}>
            <div className="texture-canvas relative overflow-hidden rounded-card border border-line bg-canvas-alt p-7 sm:p-9">
              <span
                aria-hidden
                className="paint-blob right-[-20%] top-[-25%] h-48 w-48 bg-brand/30"
              />

              <SparkIcon className="h-9 w-9 text-brand-strong" />

              <p className="mt-5 font-display text-xl font-bold leading-snug text-ink sm:text-2xl">
                «Наша миссия — развивать творческий потенциал ребенка через искусство, помогая ему
                раскрыть индивидуальность и поверить в себя.»
              </p>

              {/*
                Phones: content-sized outer columns, the middle takes the rest.
                Equal thirds gave the middle label ("ДЛИТЕЛЬНОСТЬ УРОКА", uppercase,
                tracked) ~87px on a 390px screen for a ~107px word, so it ran into
                "В НЕДЕЛЮ". From `sm` the card is wide enough for thirds again.
              */}
              <dl className="mt-8 grid grid-cols-[auto_1fr_auto] gap-4 border-t border-line-strong pt-6 sm:grid-cols-3">
                {about.stats.map((stat) => (
                  <div key={stat.label}>
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block font-display text-2xl font-extrabold text-ink sm:text-3xl">
                        {stat.value}
                      </span>
                      <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        {stat.label}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
