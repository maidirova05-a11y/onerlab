'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

/**
 * Lazy boundary for the WebGL brush.
 *
 * Two things are happening here, both of them about cost:
 *
 *   1. `ogl` is ~18 kB of the initial bundle for an effect that is purely
 *      decorative. `next/dynamic` moves it into its own chunk fetched after
 *      hydration, so the hero copy and the CTA paint without waiting on it.
 *      `ssr: false` because a canvas has nothing to contribute to the HTML.
 *
 *   2. The chunk is only requested once we know the visitor actually wants
 *      motion AND has a pointer that can produce a trail. `next/dynamic`
 *      fetches on first render of the component, so gating the render behind
 *      the media queries means a `prefers-reduced-motion` visitor — or anyone
 *      on a touch screen — never downloads the WebGL library at all.
 *
 * This has to be a Client Component: `next/dynamic` with `ssr: false` is not
 * allowed inside a Server Component, and `Hero` is one.
 */
const Ribbons = dynamic(() => import('./Ribbons').then((m) => m.Ribbons), { ssr: false });

/**
 * The academy's palette, spread around the hue wheel.
 *
 * Used to seed the ribbons before the rainbow cycling takes over, so the very
 * first frame is already on-brand rather than an arbitrary default. Yellow
 * leads, matching the logo badge.
 */
const BRUSH_PALETTE = ['#FAC90A', '#F2782B', '#E0455E', '#B14FC5', '#4A6BE8', '#1FA8B4', '#3FBF6E'];

export function BrushLayer() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    /*
     * `(pointer: fine)` — a mouse or trackpad, not a finger.
     *
     * The trail follows a cursor, and a touch screen has none: the effect only
     * appears where the user happens to drag, which reads as smearing rather
     * than painting. It also costs a live WebGL canvas on exactly the devices
     * least able to spare one. Keyed off input type rather than screen width,
     * so a small laptop window keeps it and a large tablet does not.
     */
    const finePointer = window.matchMedia('(pointer: fine)');

    const sync = () => setEnabled(!reduceMotion.matches && finePointer.matches);
    sync();
    // Reacts to the OS setting being toggled, or a mouse being plugged in.
    reduceMotion.addEventListener('change', sync);
    finePointer.addEventListener('change', sync);
    return () => {
      reduceMotion.removeEventListener('change', sync);
      finePointer.removeEventListener('change', sync);
    };
  }, []);

  if (!enabled) return null;

  return (
    <Ribbons
      colors={BRUSH_PALETTE}
      ribbonCount={7}
      rainbow
      hueSpeed={0.05}
      hueSpread={0.11}
      rainbowSaturation={0.82}
      rainbowLightness={0.58}
      baseThickness={26}
      offsetFactor={0.012}
      baseSpring={0.045}
      baseFriction={0.88}
      maxAge={420}
      pointCount={60}
      speedMultiplier={0.5}
      enableFade
      enableShaderEffect
      effectAmplitude={1.4}
    />
  );
}
