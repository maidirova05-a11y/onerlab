'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import type { AccordionGalleryItem } from './AccordionGallery';

/**
 * Lazy, responsive boundary around `AccordionGallery`.
 *
 * Three jobs:
 *
 *   1. KEEP GSAP OUT OF THE CRITICAL PATH. The gallery sits far below the fold
 *      on a page whose visitors are mostly on phones. The chunk is only
 *      requested once the section is within 400px of the viewport.
 *
 *   2. RESERVE THE SPACE. Because the real component never server-renders, a
 *      skeleton of exactly the same height stands in for it — otherwise the
 *      footer would jump up the page and then be shoved back down.
 *
 *   3. PICK THE ORIENTATION. Eight panels side by side is right on a desktop
 *      and unusable on a phone, so below `md` the accordion becomes a column.
 *      This has to be decided in JS, not only in CSS, because GSAP needs to
 *      know which axis to tilt and resize on.
 */
const AccordionGallery = dynamic(() => import('./AccordionGallery').then((m) => m.AccordionGallery), {
  ssr: false,
});

/**
 * Layout per breakpoint. The values are tuned so a collapsed panel never drops
 * below a comfortable touch target:
 *
 *   mobile  — 640px column, 8 panels ⇒ collapsed ≈ 45px each
 *   desktop — 1216px row,   8 panels ⇒ collapsed ≈ 92px each
 *
 * Breakpoints match Tailwind's `md` (768) and `lg` (1024) so the skeleton's
 * utility classes and this table can never disagree.
 */
const LAYOUTS = {
  mobile: { orientation: 'vertical', height: 400, expandRatio: 0.46, gap: 8, radius: 18 },
  tablet: { orientation: 'horizontal', height: 390, expandRatio: 0.5, gap: 8, radius: 18 },
  desktop: { orientation: 'horizontal', height: 470, expandRatio: 0.44, gap: 10, radius: 20 },
} as const;

type Breakpoint = keyof typeof LAYOUTS;

/** Matches the `height` each layout resolves to — vertical is `height * 1.6`. */
const SKELETON_HEIGHT = 'h-[640px] md:h-[390px] lg:h-[470px]';

function useBreakpoint(): Breakpoint {
  // Starts at `desktop` purely as a first guess; the effect settles it before
  // paint. Nothing server-renders here, so there is no mismatch to worry about.
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('desktop');

  useEffect(() => {
    const phone = window.matchMedia('(max-width: 767px)');
    const tablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    const sync = () => setBreakpoint(phone.matches ? 'mobile' : tablet.matches ? 'tablet' : 'desktop');

    sync();
    phone.addEventListener('change', sync);
    tablet.addEventListener('change', sync);
    return () => {
      phone.removeEventListener('change', sync);
      tablet.removeEventListener('change', sync);
    };
  }, []);

  return breakpoint;
}

export function GalleryAccordion({ items }: { items: AccordionGalleryItem[] }) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  const breakpoint = useBreakpoint();
  const layout = LAYOUTS[breakpoint];

  useEffect(() => {
    const node = holderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        setNear(true);
        // One-shot: once the chunk is on its way there is nothing left to watch.
        observer.disconnect();
      },
      { rootMargin: '400px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={holderRef}>
      {near ? (
        <AccordionGallery
          items={items}
          defaultIndex={0}
          orientation={layout.orientation}
          height={layout.height}
          expandRatio={layout.expandRatio}
          gap={layout.gap}
          radius={layout.radius}
          /* Brand palette: yellow accent bar, ink rather than the stock
             near-black purple for the gradient and the dimming. */
          accentColor="#FAC90A"
          overlayColor="#333333"
          textColor="#FFFFFF"
          trigger="hover"
          grayscale
          showLabels
          duration={0.55}
          ease="power3.out"
          parallax={0.45}
          tilt={6}
        />
      ) : (
        <div
          className={`w-full animate-pulse rounded-card bg-line/60 ${SKELETON_HEIGHT}`}
          aria-hidden
        />
      )}
    </div>
  );
}
