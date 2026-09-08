import { ADVANTAGE_ICONS, type AdvantageIconName } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { advantages } from '@/content/site';

/**
 * «Преимущества» — the six core benefits.
 *
 * One column on phones, two from `sm`, three from `lg`. The cards are a plain
 * list semantically (`<ul>`), so a screen reader announces "list, 6 items"
 * rather than reading six unrelated headings.
 */
export function Advantages() {
  return (
    <section id="advantages" className="section-wash relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container size="wide">
        <SectionHeading
          label={advantages.sectionLabel}
          title={advantages.title}
          subtitle={advantages.subtitle}
          align="center"
        />

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {advantages.items.map((item, index) => {
            const Icon = ADVANTAGE_ICONS[item.icon as AdvantageIconName];

            return (
              <Reveal as="li" key={item.title} delay={index * 70}>
                <article className="group h-full rounded-card border border-line bg-canvas p-6 transition-all duration-300 ease-paint hover:-translate-y-1 hover:border-brand hover:shadow-[0_16px_36px_rgba(51,51,51,0.09)] sm:p-7">
                  {/* Numbered chip doubles as the icon plate. */}
                  <div className="flex items-start justify-between gap-4">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-ink transition-colors duration-300 group-hover:bg-brand">
                      <Icon className="h-6 w-6" />
                    </span>
                    <span
                      aria-hidden
                      className="font-display text-2xl font-extrabold text-line-strong transition-colors duration-300 group-hover:text-brand"
                    >
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <h3 className="mt-5 text-lg font-bold leading-snug text-ink">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{item.description}</p>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
