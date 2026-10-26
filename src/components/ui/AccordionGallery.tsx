'use client';

import { gsap } from 'gsap';
import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import './AccordionGallery.css';

/* =============================================================================
   AccordionGallery — expanding image accordion.
   =============================================================================
   Adapted from the React Bits component (gsap). Ported to TSX, plus four fixes
   that this codebase forces:

     1. CALLBACK REFS NO LONGER RETURN A VALUE. Upstream writes
        `ref={el => (refs.current[i] = el)}` — an arrow with an expression body,
        so it returns the assigned element. React 19 treats a returned value as
        a cleanup function and throws. This project is on React 19.2.

     2. PANELS ARE REAL <button>s. Upstream puts `role="listitem"` and
        `tabIndex={0}` on a plain <div>: the role strips any interactive
        semantics, so a screen reader announces a list item that cannot be
        activated, and on an <a> it would override the link role too. Our items
        have no per-item destination, so a button is the honest element.

     3. ORIENTATION SWITCHES IN JS, NOT ONLY IN CSS. Upstream's mobile rule sets
        `height: auto !important`, which leaves `flex-grow` no free space to
        distribute — the accordion silently stops expanding. See AccordionGallery.css.

     4. `prefers-reduced-motion` IS STATE, NOT A RENDER-TIME `window` READ.
        Reading it during render both breaks SSR and never updates if the
        visitor changes the setting.
   ============================================================================= */

export interface AccordionGalleryItem {
  image: string;
  label?: string;
  link?: string;
  alt?: string;
}

export interface AccordionGalleryProps {
  items: AccordionGalleryItem[];
  defaultIndex?: number;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  /** Row height in px (column length when vertical). */
  height?: number;
  gap?: number;
  radius?: number;
  /** Fraction of the row the open panel takes, clamped to 0.2 – 0.9. */
  expandRatio?: number;
  orientation?: 'horizontal' | 'vertical';
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: 'hover' | 'click';
  showLabels?: boolean;
  grayscale?: boolean;
  className?: string;
}

export function AccordionGallery({
  items,
  defaultIndex = 2,
  accentColor = '#ffffff',
  overlayColor = '#060010',
  textColor = '#ffffff',
  height = 460,
  gap = 10,
  radius = 16,
  expandRatio = 0.52,
  orientation = 'horizontal',
  duration = 0.6,
  ease = 'power3.out',
  parallax = 0.5,
  tilt = 8,
  stagger = 0.06,
  trigger = 'hover',
  showLabels = true,
  grayscale = true,
  className = '',
}: AccordionGalleryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const barRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);

  const vertical = orientation === 'vertical';
  const count = items.length;
  const [active, setActive] = useState(Math.min(Math.max(defaultIndex, 0), Math.max(count - 1, 0)));

  /**
   * Reduced motion as state (fix 4). Starts `false` so the server render and
   * the first client render agree, then the effect corrects it — no hydration
   * mismatch, and it stays live if the OS setting is toggled.
   */
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current;
      if (!panels.length) return;

      const ratio = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = count > 1 ? (ratio * (count - 1)) / (1 - ratio) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !prefersReduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const bar = barRefs.current[i];
        const text = textRefs.current[i];

        // Collapsed panels tip away from the open one, so the row reads as a
        // fan rather than a flat strip.
        const rot = isActive ? 0 : i < active ? tilt : -tilt;
        const rotProp = vertical ? { rotateX: -rot } : { rotateY: rot };

        tl.to(panel, { flexGrow: isActive ? grow : 1, ...rotProp, duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          const gray = grayscale ? (isActive ? 0 : 1) : 0;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: vertical ? 0 : isActive ? 0 : shift,
              y: vertical ? (isActive ? 0 : shift) : 0,
              '--ag-gray': gray,
              '--ag-dim': isActive ? 0 : 0.35,
              duration: dur,
              ease,
            },
            0,
          );
        }

        if (showLabels && bar && text) {
          if (isActive) {
            tl.to(
              [bar, text],
              { opacity: 1, x: 0, duration: dur, ease, stagger: prefersReduced ? 0 : stagger },
              0,
            );
          } else {
            tl.to([bar, text], { opacity: 0, x: -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      tlRef.current = tl;
    },
    [
      active,
      count,
      expandRatio,
      duration,
      ease,
      vertical,
      tilt,
      parallax,
      grayscale,
      showLabels,
      stagger,
      prefersReduced,
    ],
  );

  /**
   * `applyLayout` is deliberately NOT a dependency here.
   *
   * It changes identity on every hover (it closes over `active`), and having
   * the ResizeObserver torn down and rebuilt on each hover is both wasteful and
   * a source of missed resize events. The observer only needs the geometry
   * inputs; the layout pass itself is driven by the effect below.
   */
  const applyLayoutRef = useRef(applyLayout);
  // Refreshed after each commit, not during render (React may render and throw
  // a render away); a layout effect still runs before every passive effect.
  useLayoutEffect(() => {
    applyLayoutRef.current = applyLayout;
  });

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const total = vertical ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      // 1.22 overshoot gives the parallax drift room to move inside the frame
      // without ever exposing an edge.
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty('--ag-media-size', `${size}px`);
      applyLayoutRef.current(!firstRunRef.current);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, count, expandRatio, vertical]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(() => () => void tlRef.current?.kill(), []);

  const handleEnter = (i: number) => {
    if (trigger === 'hover') setActive(i);
  };

  const handleKeyDown = (i: number, event: React.KeyboardEvent) => {
    const forward = vertical ? 'ArrowDown' : 'ArrowRight';
    const back = vertical ? 'ArrowUp' : 'ArrowLeft';
    let next: number | null = null;

    if (event.key === forward) next = (i + 1) % count;
    else if (event.key === back) next = (i - 1 + count) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    if (next === null) return;

    event.preventDefault();
    setActive(next);
    // Move focus with the selection, otherwise the next arrow press would
    // navigate from the old panel and the two would drift apart.
    panelRefs.current[next]?.focus();
  };

  return (
    <div
      ref={rootRef}
      className={`accordion-gallery${vertical ? ' accordion-gallery--vertical' : ''}${className ? ` ${className}` : ''}`}
      style={
        {
          '--ag-accent': accentColor,
          '--ag-overlay': overlayColor,
          '--ag-text': textColor,
          '--ag-gap': `${gap}px`,
          '--ag-radius': `${radius}px`,
          height: vertical ? `${Math.round(height * 1.6)}px` : `${height}px`,
        } as React.CSSProperties
      }
      role="group"
      aria-label="Галерея работ"
    >
      {items.map((item, i) => {
        const isActive = i === active;
        return (
          <button
            key={item.image}
            type="button"
            ref={(el) => {
              // Block body: a returned value would be read as a cleanup
              // function by React 19 and throw (fix 1).
              panelRefs.current[i] = el;
            }}
            className={`ag-panel${isActive ? ' ag-panel--active' : ''}`}
            style={{ borderRadius: `${radius}px` }}
            onClick={() => setActive(i)}
            onMouseEnter={() => handleEnter(i)}
            onFocus={() => setActive(i)}
            onKeyDown={(event) => handleKeyDown(i, event)}
            aria-expanded={isActive}
            aria-label={item.label}
          >
            <span className="ag-panel__frame">
              <span
                className="ag-panel__media"
                ref={(el) => {
                  mediaRefs.current[i] = el;
                }}
              >
                {/* next/image only for its srcset and AVIF/WebP — the box is
                    still sized by the stylesheet (`.ag-panel__media img` is
                    100% × 100%, object-fit: cover), which GSAP resizes, so the
                    intrinsic 900×1200 never takes part in layout. `sizes`
                    follows `--ag-media-size` (open-panel width × 1.22): ≈620px
                    on desktop, ≈420px on tablets, the column width on phones. */}
                <Image
                  src={item.image}
                  alt={item.alt ?? item.label ?? ''}
                  width={900}
                  height={1200}
                  sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1023px) 420px, 640px"
                  draggable={false}
                  loading="lazy"
                />
              </span>
              <span className="ag-panel__overlay" aria-hidden="true" />
            </span>

            {showLabels && (
              <span className="ag-panel__label" aria-hidden="true">
                <span
                  className="ag-panel__bar"
                  ref={(el) => {
                    barRefs.current[i] = el;
                  }}
                />
                <span
                  className="ag-panel__text"
                  ref={(el) => {
                    textRefs.current[i] = el;
                  }}
                >
                  {item.label}
                </span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default AccordionGallery;
