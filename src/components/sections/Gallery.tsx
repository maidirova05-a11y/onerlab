import { ArrowRightIcon, InstagramIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { GalleryAccordion } from '@/components/ui/GalleryAccordion';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { contacts, gallery } from '@/content/site';

/**
 * «Галерея» — an expanding accordion of student work, teachers and the studio.
 *
 * Hovering, tapping or tabbing onto a panel opens it and restores its colour
 * while the rest stay desaturated, so a visitor can browse the whole set
 * without leaving the page.
 *
 * The panels themselves currently render generated brand placeholders. To
 * publish real photos, see the note on `gallery.items` in `content/site.ts`.
 */
export function Gallery() {
  return (
    <section id="gallery" className="section-wash relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container size="wide">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading
            label={gallery.sectionLabel}
            title={gallery.title}
            subtitle={gallery.subtitle}
            className="lg:max-w-2xl"
          />

          <Reveal delay={120} className="shrink-0">
            <Button href={contacts.instagramUrl} variant="secondary" size="md">
              <InstagramIcon className="h-5 w-5" />
              {gallery.cta}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Reveal>
        </div>

        <Reveal delay={80} className="mt-12">
          <GalleryAccordion
            items={gallery.items.map((item) => ({
              image: item.image,
              label: item.caption,
              alt: item.caption,
            }))}
          />
        </Reveal>

        <p className="mt-8 text-center text-sm text-ink-muted">
          Наведите на панель, чтобы рассмотреть работу. Здесь появятся фотографии работ учеников и
          занятий в студии.
        </p>
      </Container>
    </section>
  );
}
