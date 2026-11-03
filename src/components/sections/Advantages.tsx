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
    <section id="advantages" className="relative bg-canvas-alt scroll-mt-24 py-16 sm:py-20 lg:py-24">
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
                <article className="group h-full rounded-card border border-line bg-canvas p-6 transition-colors duration-200 ease-paint hover:border-line-strong sm:p-7">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-soft text-ink">
                    <Icon className="h-6 w-6" />
                  </span>

                  <h3 className="mt-5 text-lg font-semibold leading-snug text-ink">{item.title}</h3>
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
