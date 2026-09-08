'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import './MaskedLogo.css';

/**
 * =============================================================================
 * MaskedLogo — the OnerLab wordmark, painted on with footage inside it.
 * =============================================================================
 * The same idea as MaskedHeading, but the aperture is the real logo instead of
 * rendered text. See the stylesheet for how the two masks composite.
 *
 * ACCESSIBILITY: the wordmark is the studio's name, so this is `role="img"`
 * with the name as its label — a screen reader announces "OnerLab" rather than
 * skipping a decorative box. A visually-hidden copy of the text is rendered
 * too, because `aria-label` is not text content and does not survive into the
 * page's readable copy.
 * =============================================================================
 */

interface MaskedLogoProps {
  /** Path to a background-removed PNG/SVG. Its alpha channel is the mask. */
  logoSrc: string;
  /**
   * Optional opaque overlay composited back on top of the footage — used to
   * keep the yellow "lab" badge as itself instead of filling it with video.
   */
  badgeSrc?: string;
  mediaType?: 'image' | 'video';
  /** Footage (or still) that shows through the letterforms. */
  src: string;
  /** Still used in place of the footage when a second decoder is too costly. */
  fallbackSrc?: string;
  /** Accessible name, and the visually-hidden text. */
  label: string;
  /** Seconds the brush takes to cross the mark. */
  duration?: number;
  /**
   * CSS selector for the backdrop <video> this one must stay in step with.
   *
   * Geometry alone is not enough to make the mark read as a window: two
   * <video> elements playing the same file start whenever they each finish
   * buffering and drift apart from there, so the letters end up showing a
   * different moment than the backdrop behind them.
   */
  syncWith?: string;
  /**
   * Below this width the letterforms fall back to a still instead of a second
   * <video>. Two simultaneous 1280x720 decoders is the cost of the "window"
   * illusion, and a phone pays it in dropped frames and doubled data. Measured
   * on desktop: both elements decode a full 144 frames per 6s.
   */
  videoMinWidth?: number;
  brightness?: number;
  saturation?: number;
  className?: string;
  style?: CSSProperties;
}

export function MaskedLogo({
  logoSrc,
  badgeSrc,
  mediaType = 'image',
  src,
  fallbackSrc,
  label,
  duration = 2.1,
  syncWith,
  videoMinWidth = 0,
  brightness = 1.3,
  saturation = 1.2,
  className = '',
  style,
}: MaskedLogoProps) {
  // Starts false so the server render and the first client render agree; the
  // effect promotes it to video only where the device can afford one.
  const [canAffordVideo, setCanAffordVideo] = useState(videoMinWidth === 0);

  const sweepRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const badgeRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const sweep = sweepRef.current;
    if (!sweep) return;

    // Restart-safe: remove, force reflow, re-add. Without the reflow the
    // browser coalesces the two class writes and the animation never replays.
    const targets = [sweep, badgeRef.current].filter(Boolean) as HTMLElement[];
    for (const el of targets) el.classList.remove('is-painting');
    void sweep.offsetWidth;
    for (const el of targets) el.classList.add('is-painting');
  }, [duration, src]);

  useEffect(() => {
    if (videoMinWidth === 0) return;
    const wide = window.matchMedia(`(min-width: ${videoMinWidth}px)`);
    const sync = () => setCanAffordVideo(wide.matches);
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, [videoMinWidth]);

  // Keep this copy locked to the backdrop's playhead.
  useEffect(() => {
    const mine = videoRef.current;
    if (!mine || !syncWith || !canAffordVideo) return;

    const source = document.querySelector<HTMLVideoElement>(syncWith);
    if (!source) return;

    // Correct only past a threshold: assigning currentTime forces a seek, and
    // seeking every tick would stutter the picture for no visible gain.
    const align = () => {
      if (!Number.isFinite(source.currentTime)) return;
      if (Math.abs(mine.currentTime - source.currentTime) > 0.08) {
        mine.currentTime = source.currentTime;
      }
    };

    align();
    source.addEventListener('timeupdate', align);
    source.addEventListener('play', align);
    source.addEventListener('seeked', align);
    mine.addEventListener('loadeddata', align);

    return () => {
      source.removeEventListener('timeupdate', align);
      source.removeEventListener('play', align);
      source.removeEventListener('seeked', align);
      mine.removeEventListener('loadeddata', align);
    };
  }, [syncWith, canAffordVideo]);

  return (
    <div
      role="img"
      aria-label={label}
      className={`masked-logo ${className}`.trim()}
      style={
        {
          '--ml-logo': `url("${logoSrc}")`,
          '--ml-duration': `${duration}s`,
          ...style,
        } as CSSProperties
      }
    >
      {/* Not announced twice: the parent already carries the name. */}
      <span className="sr-only-focusable" aria-hidden>
        {label}
      </span>

      {/* Outer box clips to the letterforms; inner box runs the brush. */}
      <div className="masked-logo__media">
        <div ref={sweepRef} className="masked-logo__sweep">
          {mediaType === 'video' && canAffordVideo ? (
            <video
              ref={videoRef}
              className="masked-logo__source"
              src={src}
                autoPlay
              muted
              loop
              playsInline
              aria-hidden
              tabIndex={-1}
              style={{ filter: `brightness(${brightness}) saturate(${saturation})` }}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- masked decorative fill
            <img
              className="masked-logo__source"
              src={mediaType === 'video' ? (fallbackSrc ?? src) : src}
              alt=""
              draggable={false}
              style={{ filter: `brightness(${brightness}) saturate(${saturation})` }}
            />
          )}
        </div>
      </div>

      {badgeSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- fixed-position
        // overlay sized in percentages; the optimiser cannot help here.
        <img ref={badgeRef} src={badgeSrc} alt="" aria-hidden className="masked-logo__badge" />
      )}
    </div>
  );
}
