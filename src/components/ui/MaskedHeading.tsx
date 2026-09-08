'use client';

import { useCallback, useEffect, useId, useMemo, useRef, type CSSProperties } from 'react';

import './MaskedHeading.css';

/**
 * =============================================================================
 * MaskedHeading — video or image showing through the letterforms.
 * =============================================================================
 * Ported from the React Bits component. Changes made for this codebase:
 *
 *   • TypeScript, and `'use client'` — it uses refs, rAF and ResizeObserver.
 *   • A `brush` reveal, which is the one this site actually uses. See the note
 *     on `.masked-heading__reveal--brush` in the CSS for why the stock `wipe`
 *     reads wrong for a painting studio.
 *   • `prefers-reduced-motion` now also stops the idle drift and the pointer
 *     parallax. Upstream only checked it for the entrance, so a user who asked
 *     for less motion still got a heading that never stopped moving.
 *   • The rAF loop is not started at all when there is nothing to animate
 *     (no drift, no parallax), instead of running forever computing zeroes.
 *   • GSAP is imported LAZILY, and only by the rise/wipe/fade reveals. The
 *     brush reveal — the only one this site uses, and the one on the first
 *     screen — is pure CSS, so a ~30 kB animation library no longer sits on
 *     the critical path of the landing page's opening frame.
 * =============================================================================
 */

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value;

export type MaskedHeadingReveal = 'brush' | 'rise' | 'wipe' | 'fade' | 'none';

interface MaskedHeadingProps {
  text: string;
  tag?: 'h1' | 'h2' | 'h3' | 'div' | 'p';
  mediaType?: 'image' | 'video';
  src: string;
  poster?: string;
  /** How far the media is zoomed past the heading; the overscan parallax travels into. */
  fillScale?: number;
  /** Pointer-driven travel, in px. 0 disables it. */
  parallax?: number;
  /** Amplitude of the slow idle motion, in px. 0 holds the media still. */
  drift?: number;
  brightness?: number;
  saturation?: number;
  grayscale?: boolean;
  reveal?: MaskedHeadingReveal;
  trigger?: 'view' | 'mount' | 'hover';
  duration?: number;
  stagger?: number;
  align?: 'left' | 'center' | 'right';
  weight?: number;
  tracking?: number;
  lineHeight?: number;
  /** Type size as a fraction of container width, so the heading stays fluid. */
  textScale?: number;
  /** Clamp for the computed font size, in px. */
  minFontSize?: number;
  maxFontSize?: number;
  className?: string;
  style?: CSSProperties;
}

export function MaskedHeading({
  text,
  tag: Tag = 'h2',
  mediaType = 'image',
  src,
  poster = '',
  fillScale = 1.25,
  parallax = 26,
  drift = 18,
  brightness = 1,
  saturation = 1,
  grayscale = false,
  reveal = 'brush',
  trigger = 'mount',
  duration = 1.6,
  stagger = 0.09,
  align = 'center',
  weight = 800,
  tracking = -0.03,
  lineHeight = 1.06,
  textScale = 0.115,
  minFontSize = 20,
  maxFontSize = 200,
  className = '',
  style,
}: MaskedHeadingProps) {
  const rootRef = useRef<HTMLElement | null>(null);
  const measureRef = useRef<HTMLSpanElement | null>(null);
  const revealRef = useRef<HTMLSpanElement | null>(null);
  const mediaRef = useRef<HTMLSpanElement | null>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const baseRefs = useRef<(HTMLElement | null)[]>([]);
  const glyphRefs = useRef<(SVGTextElement | null)[]>([]);
  const tweenRef = useRef<{ kill: () => void } | null>(null);
  const offsetRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // useId() emits characters that are illegal in a CSS url(#…) reference.
  const clipId = `mh-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const words = useMemo(() => String(text).split(/\s+/).filter(Boolean), [text]);

  // Read through a ref so the animation loop never has to be torn down and
  // rebuilt when a purely visual prop changes.
  const settingsRef = useRef({ fillScale, parallax, drift, brightness, saturation, grayscale, textScale, minFontSize, maxFontSize });
  settingsRef.current = { fillScale, parallax, drift, brightness, saturation, grayscale, textScale, minFontSize, maxFontSize };

  /** Positions and filters the media. Called every frame. */
  const place = useCallback(() => {
    const root = rootRef.current;
    const media = mediaRef.current;
    if (!root || !media) return;

    const s = settingsRef.current;
    const off = offsetRef.current;

    // Never travel further than the overscan, or an empty edge would show
    // through the glyphs.
    const maxX = Math.max(0, ((s.fillScale - 1) / 2) * root.clientWidth);
    const maxY = Math.max(0, ((s.fillScale - 1) / 2) * root.clientHeight);

    media.style.transform = `translate3d(${clamp(off.x, -maxX, maxX).toFixed(2)}px, ${clamp(off.y, -maxY, maxY).toFixed(2)}px, 0) scale(${s.fillScale})`;
    media.style.filter = `brightness(${s.brightness}) saturate(${s.saturation})${s.grayscale ? ' grayscale(1)' : ''}`;
  }, []);

  /**
   * Copies the measured HTML layout onto the SVG glyphs.
   *
   * This is the crux of the component: the SVG <text> nodes carry no layout of
   * their own, so each one is moved to the x/offsetLeft and y/baseline of the
   * corresponding HTML word and given its exact computed font. Any drift
   * between the two — a font loading late, a resize — shows up as the mask
   * sliding off the letters, which is why this reruns on both.
   */
  const sync = useCallback(() => {
    const root = rootRef.current;
    const measure = measureRef.current;
    if (!root || !measure) return;

    const s = settingsRef.current;
    root.style.fontSize = `${clamp(root.clientWidth * s.textScale, s.minFontSize, s.maxFontSize).toFixed(1)}px`;

    const computed = window.getComputedStyle(measure);
    for (let i = 0; i < wordRefs.current.length; i += 1) {
      const box = wordRefs.current[i];
      const base = baseRefs.current[i];
      const glyph = glyphRefs.current[i];
      if (!box || !base || !glyph) continue;

      glyph.setAttribute('x', String(box.offsetLeft));
      glyph.setAttribute('y', String(base.offsetTop));
      glyph.style.fontFamily = computed.fontFamily;
      glyph.style.fontSize = computed.fontSize;
      glyph.style.fontWeight = computed.fontWeight;
      glyph.style.fontStyle = computed.fontStyle;
      glyph.style.letterSpacing = computed.letterSpacing;
    }
    place();
  }, [place]);

  // --- Layout sync + idle motion ------------------------------------------
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    sync();

    const observer = new ResizeObserver(sync);
    observer.observe(root);

    // Webfonts almost always resolve after first paint. Without this the mask
    // is measured against the fallback face and sits visibly off the glyphs.
    void document.fonts?.ready.then(sync).catch(() => {});

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;

    const start = () => {
      const s = settingsRef.current;
      // Nothing to animate: place once and leave the main thread alone.
      if (reduceMotion.matches || (s.drift <= 0 && s.parallax <= 0)) {
        offsetRef.current = { x: 0, y: 0, tx: 0, ty: 0 };
        place();
        return;
      }

      let last = performance.now();
      let clock = 0;

      const frame = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        clock += dt;

        const settings = settingsRef.current;
        const off = offsetRef.current;

        const driftX = Math.sin(clock * 0.21) * settings.drift;
        const driftY = Math.cos(clock * 0.17) * settings.drift * 0.6;

        // Exponential smoothing, framerate-independent: the media eases toward
        // the pointer target rather than snapping to it.
        const ease = 1 - Math.exp(-dt / 0.18);
        off.x += (off.tx + driftX - off.x) * ease;
        off.y += (off.ty + driftY - off.y) * ease;

        place();
        frameId = requestAnimationFrame(frame);
      };

      frameId = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      const s = settingsRef.current;
      if (s.parallax <= 0 || reduceMotion.matches) return;

      const rect = root.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const ny = ((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1;
      offsetRef.current.tx = clamp(nx, -1, 1) * -s.parallax;
      offsetRef.current.ty = clamp(ny, -1, 1) * -s.parallax;
    };

    const onLeave = () => {
      offsetRef.current.tx = 0;
      offsetRef.current.ty = 0;
    };

    const restart = () => {
      cancelAnimationFrame(frameId);
      start();
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    reduceMotion.addEventListener('change', restart);
    start();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      reduceMotion.removeEventListener('change', restart);
    };
  }, [place, sync]);

  useEffect(() => {
    sync();
  }, [sync, words, align, weight, tracking, lineHeight, textScale]);

  // --- Entrance ------------------------------------------------------------
  useEffect(() => {
    const root = rootRef.current;
    const layer = revealRef.current;
    if (!root || !layer) return;

    const glyphs = glyphRefs.current.filter((g): g is SVGTextElement => g !== null);
    if (!glyphs.length) return;

    const riseDistance = () => (parseFloat(window.getComputedStyle(root).fontSize) || 48) * 1.15;

    /** The finished state. */
    /** The finished state, written directly so it costs no library. */
    const settle = () => {
      for (const g of glyphs) g.style.transform = '';
      layer.style.opacity = '1';
      layer.style.transform = '';
      layer.style.clipPath = 'inset(0% 0% 0% 0%)';
      layer.classList.remove('is-painting');
    };

    /**
     * The pre-entrance state.
     *
     * Nothing to do for `brush` — its hidden state lives inside the keyframes,
     * so it only ever exists while the animation is actually running. The CSS
     * default is the finished value, which is what keeps the heading visible if
     * this bundle never executes.
     */
    const rest = () => {
      if (reveal === 'brush') return;
      if (reveal === 'rise') gsap.set(glyphs, { y: riseDistance() });
      else if (reveal === 'wipe') gsap.set(layer, { clipPath: 'inset(0% 100% 0% 0%)' });
      else if (reveal === 'fade') gsap.set(layer, { opacity: 0, scale: 1.08 });
    };

    if (reveal === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle();
      return;
    }

    let cancelled = false;

    const play = () => {
      tweenRef.current?.kill();

      if (reveal === 'brush') {
        settle();
        // Hand off to CSS: add the class, let the browser own the timing and
        // guarantee the end state. See the @keyframes note in the stylesheet.
        layer.style.setProperty('--mh-duration', `${duration}s`);
        layer.classList.remove('is-painting');
        void layer.offsetWidth; // reflow, so re-adding the class restarts it
        layer.classList.add('is-painting');
        return;
      }

      // rise / wipe / fade genuinely need a tweening engine (per-word stagger,
      // eased clip interpolation), so pay for it only when one is requested.
      void import('gsap').then(({ gsap }) => {
        if (cancelled) return;

        if (reveal === 'rise') {
        gsap.set(layer, { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)' });
        tweenRef.current = gsap.fromTo(
          glyphs,
          { y: riseDistance() },
          { y: 0, duration, stagger, ease: 'power4.out', overwrite: 'auto' },
        );
      } else if (reveal === 'wipe') {
        gsap.set(glyphs, { y: 0 });
        const state = { p: 100 };
        tweenRef.current = gsap.to(state, {
          p: 0,
          duration,
          ease: 'power3.inOut',
          overwrite: 'auto',
          onUpdate: () => {
            layer.style.clipPath = `inset(0% ${state.p}% 0% 0%)`;
          },
        });
      } else {
        gsap.set(glyphs, { y: 0 });
        tweenRef.current = gsap.fromTo(
          layer,
          { opacity: 0, scale: 1.08 },
          { opacity: 1, scale: 1, duration, ease: 'power3.out', overwrite: 'auto' },
        );
      }
      });
    };

    if (trigger === 'hover') {
      settle();
      root.addEventListener('pointerenter', play);
      return () => {
        cancelled = true;
        root.removeEventListener('pointerenter', play);
        tweenRef.current?.kill();
      };
    }

    if (trigger === 'view') {
      rest();
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            play();
            observer.disconnect();
          }
        },
        { threshold: 0.25 },
      );
      observer.observe(root);
      return () => {
        cancelled = true;
        observer.disconnect();
        tweenRef.current?.kill();
      };
    }

    rest();
    play();
    return () => {
      cancelled = true;
      tweenRef.current?.kill();
    };
  }, [reveal, trigger, duration, stagger, words]);

  return (
    <Tag
      ref={rootRef as never}
      className={`masked-heading ${className}`.trim()}
      style={{ textAlign: align, fontWeight: weight, letterSpacing: `${tracking}em`, lineHeight, ...style }}
    >
      {/* The real text: laid out, selectable, and read by crawlers. */}
      <span ref={measureRef} className="masked-heading__measure">
        {words.map((word, i) => (
          <span
            key={`${word}-${i}`}
            ref={(el) => {
              wordRefs.current[i] = el;
            }}
            className="masked-heading__word"
          >
            {word}
            <i
              ref={(el) => {
                baseRefs.current[i] = el;
              }}
              className="masked-heading__baseline"
            />
          </span>
        ))}
      </span>

      <svg className="masked-heading__defs" aria-hidden focusable="false">
        <defs>
          <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
            {words.map((word, i) => (
              <text
                key={`${word}-${i}`}
                ref={(el) => {
                  glyphRefs.current[i] = el;
                }}
              >
                {word}
              </text>
            ))}
          </clipPath>
        </defs>
      </svg>

      <span
        ref={revealRef}
        className={`masked-heading__reveal${reveal === 'brush' ? ' masked-heading__reveal--brush' : ''}`}
        aria-hidden
      >
        <span className="masked-heading__clip" style={{ clipPath: `url(#${clipId})` }}>
          <span ref={mediaRef} className="masked-heading__media">
            {mediaType === 'video' ? (
              <video
                className="masked-heading__source"
                src={src}
                poster={poster || undefined}
                autoPlay
                muted
                loop
                playsInline
                // Decorative duplicate of the background footage.
                aria-hidden
                tabIndex={-1}
              />
            ) : (
              <img className="masked-heading__source" src={src} alt="" draggable={false} />
            )}
          </span>
        </span>
      </span>
    </Tag>
  );
}
