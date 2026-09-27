import { ArrowRightIcon, CheckIcon, PhoneIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { contacts, hero } from '@/content/site';

/**
 * Hero section.
 *
 * Mobile-first composition: the headline, the sub-headline and one unmistakable
 * yellow CTA stack in a single column and fill the first screen on a phone. The
 * decorative artwork only appears from `lg` upward, where there is room for it
 * without pushing the CTA below the fold.
 *
 * The section carries no background of its own. The blobs and the brush that
 * used to be scoped to it now run the length of the page from the root layout,
 * and a solid `bg-canvas` here would sit on top of both.
 */
export function Hero() {
  return (
    <section className="texture-canvas relative pt-28 pb-16 sm:pt-32 sm:pb-20 lg:pt-40 lg:pb-28">
      <Container size="wide" className="relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* --- Copy column --- */}
          {/* `min-w-0` overrides a grid item's default `min-width: auto`, which
              would otherwise let any unbreakable content push the column wider
              than its track and get clipped on narrow phones. */}
          <div className="min-w-0">
            <Reveal>
              <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-canvas px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-ink-soft shadow-sm">
                <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
                {hero.eyebrow}
              </span>
            </Reveal>

            {/* The single H1 on the page. */}
            <Reveal delay={80}>
              {/*
                The brush stroke is applied to ONE word on purpose. `.brush-underline`
                is `white-space: nowrap` (the painted stroke cannot survive a line
                break), so highlighting a two-word phrase would make an unbreakable
                377px box inside a 335px column on a 375px phone — and grid items
                default to `min-width: auto`, so it would overflow and get clipped.
              */}
              <h1 className="mt-6 text-[2.1rem] font-extrabold leading-[1.1] text-ink sm:text-5xl lg:text-[3.5rem]">
                Раскройте творческий <span className="brush-underline">потенциал</span> вашего
                ребенка с OnerLab
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
                {hero.subtitle}
              </p>
            </Reveal>

            <Reveal delay={240}>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button href="#signup" size="lg" className="w-full sm:w-auto">
                  {hero.primaryCta}
                  <ArrowRightIcon className="h-5 w-5" />
                </Button>

                <Button
                  href={`tel:${contacts.phoneE164}`}
                  variant="secondary"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  <PhoneIcon className="h-5 w-5" />
                  {contacts.phoneDisplay}
                </Button>
              </div>
            </Reveal>

            <Reveal delay={320}>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
                {hero.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
                    <CheckIcon className="h-4 w-4 shrink-0 text-brand-strong" />
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* --- Artwork column (desktop only) --- */}
          <Reveal delay={200} className="hidden lg:block">
            <HeroArtwork />
          </Reveal>
        </div>
      </Container>
    </section>
  );
}

/**
 * Decorative "canvas on an easel" built from CSS + inline SVG rather than a
 * photograph — nothing extra to download, and it can never render as a broken
 * image while the academy is still gathering real studio photos.
 */
function HeroArtwork() {
  return (
    <div aria-hidden className="relative mx-auto max-w-md">
      {/* Back canvas — tilted, yellow */}
      <div className="absolute -left-6 top-8 h-[74%] w-[62%] rotate-[-7deg] rounded-2xl bg-brand/85 shadow-[0_18px_45px_rgba(51,51,51,0.16)]" />

      {/* Front canvas — white, holds the illustration */}
      <div className="relative rotate-[3deg] rounded-2xl border border-line bg-canvas p-4 shadow-[0_26px_60px_rgba(51,51,51,0.14)]">
        <div className="texture-canvas overflow-hidden rounded-xl border border-line bg-canvas-alt">
          <svg viewBox="0 0 400 320" className="h-auto w-full" role="presentation">
            {/* sky wash */}
            <rect width="400" height="320" fill="#FFFDF5" />
            <circle cx="308" cy="72" r="38" fill="#FAC90A" opacity="0.9" />
            {/* hills */}
            <path d="M0 232 C 70 178, 128 214, 190 190 C 250 166, 318 200, 400 176 L400 320 L0 320Z" fill="#5D5D5D" opacity="0.16" />
            <path d="M0 262 C 84 226, 150 258, 226 238 C 300 220, 340 246, 400 232 L400 320 L0 320Z" fill="#333333" opacity="0.2" />
            {/* brush strokes */}
            <path d="M36 104 C 92 62, 140 128, 196 92" stroke="#FAC90A" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.85" />
            <path d="M52 146 C 104 122, 136 168, 188 140" stroke="#5D5D5D" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.5" />
            {/* three little trees */}
            <g opacity="0.65">
              <circle cx="96" cy="236" r="20" fill="#5D5D5D" />
              <rect x="93" y="252" width="6" height="26" rx="3" fill="#333333" />
              <circle cx="150" cy="248" r="14" fill="#333333" opacity="0.55" />
              <rect x="147" y="260" width="5" height="20" rx="2.5" fill="#333333" />
            </g>
          </svg>
        </div>

        {/* Frame footer, like a gallery label. Right-aligned so the floating
            price chip, which overlaps the bottom-left corner, never covers it. */}
        <div className="mt-3 flex items-center justify-end gap-3 px-1">
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-ink-faint">
            OnerLab · Астана
          </span>
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            <span className="h-2.5 w-2.5 rounded-full bg-ink-soft" />
            <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          </span>
        </div>
      </div>

      {/* Floating price chip */}
      <div className="absolute -bottom-6 -left-4 rotate-[-4deg] rounded-2xl bg-ink px-5 py-3 text-white shadow-[0_14px_30px_rgba(51,51,51,0.28)]">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-brand">
          Пробный урок
        </p>
        <p className="text-xl font-extrabold">5 000 ₸</p>
      </div>
    </div>
  );
}
