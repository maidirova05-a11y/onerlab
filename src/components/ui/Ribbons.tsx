'use client';

import { Color, Polyline, Renderer, Transform, Vec3 } from 'ogl';
import { useEffect, useRef } from 'react';

import './Ribbons.css';

/* =============================================================================
   Ribbons — a WebGL brush that paints wherever the cursor goes.
   =============================================================================
   Adapted from the React Bits "Ribbons" component (ogl). Ported to TSX and
   changed in five places, each of which matters for this page:

     1. POINTER TRACKING MOVED TO `window`. Upstream listens on its own
        container, which forces that container to be hit-testable — it would sit
        on top of the hero and swallow clicks on the "Записать на пробный урок"
        button. Listening on window lets the layer stay `pointer-events: none`
        and still follow the cursor across the whole section.

     2. ARRAY PROPS NO LONGER REMOUNT THE RENDERER. Upstream puts `colors` and
        `backgroundColor` straight into the effect's dependency array. Array
        literals get a fresh identity on every parent render, so the whole
        WebGL context was torn down and rebuilt each time. Here the deps are
        serialised, and the live values are read through a ref.

     3. THE GL CONTEXT IS EXPLICITLY RELEASED on unmount. Browsers cap how many
        live WebGL contexts a page may hold (~16) and dropping the canvas is not
        enough to reclaim one.

     4. BRUSH WIDTH PROFILE. Upstream tapers both ends equally, which reads as a
        floating leaf. A brush has a tip where it meets the canvas and a long
        thinning trail behind it as the paint runs out.

     5. RAINBOW HUE CYCLING, plus honouring `prefers-reduced-motion` and pausing
        the render loop while the section is off-screen or the tab is hidden.
   ============================================================================= */

export interface RibbonsProps {
  /** Ribbon colours. Ignored when `rainbow` is on, except as a fallback count. */
  colors?: string[];
  /** How many ribbons to draw. Defaults to `colors.length`. */
  ribbonCount?: number;
  /** Cycle every ribbon continuously through the hue wheel. */
  rainbow?: boolean;
  /** Hue revolutions per second when `rainbow` is on. */
  hueSpeed?: number;
  /** Hue distance between neighbouring ribbons, in turns (0.14 ≈ 50°). */
  hueSpread?: number;
  /** Saturation / lightness for the generated rainbow colours. */
  rainbowSaturation?: number;
  rainbowLightness?: number;
  /** Spring factor pulling the head of the ribbon toward the cursor. */
  baseSpring?: number;
  /** Friction damping that motion. */
  baseFriction?: number;
  /** Base stroke width, in pixels. */
  baseThickness?: number;
  /** Horizontal spread of the ribbon heads — the "bristles" of the brush. */
  offsetFactor?: number;
  /** How long, in ms, the trail takes to catch up. */
  maxAge?: number;
  /** Points per ribbon. More points = smoother curve. */
  pointCount?: number;
  /** Multiplier on how fast trailing points chase the head. */
  speedMultiplier?: number;
  /** Fade the stroke out along its length, like paint running out. */
  enableFade?: boolean;
  /** Sine displacement along the stroke — reads as bristle wobble. */
  enableShaderEffect?: boolean;
  effectAmplitude?: number;
  /** RGBA clear colour. Default is fully transparent. */
  backgroundColor?: [number, number, number, number];
  /** Cap on device pixel ratio. 2 is plenty and keeps phones cool. */
  maxDpr?: number;
  className?: string;
}

/**
 * HSL → RGB, all channels in 0..1, hue in turns.
 *
 * ogl's `Color` holds plain 0..1 RGB, so the hue cycling has to be converted
 * every frame. This is the branchless formulation — no allocation, no strings,
 * cheap enough to run once per ribbon per frame.
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}

interface Line {
  spring: number;
  friction: number;
  mouseVelocity: Vec3;
  mouseOffset: Vec3;
  points: Vec3[];
  polyline: Polyline;
  /** Where this ribbon sits on the hue wheel relative to the others. */
  hueOffset: number;
}

export function Ribbons({
  colors = ['#FC8EAC'],
  ribbonCount,
  rainbow = false,
  hueSpeed = 0.06,
  hueSpread = 0.14,
  rainbowSaturation = 0.85,
  rainbowLightness = 0.6,
  baseSpring = 0.03,
  baseFriction = 0.9,
  baseThickness = 30,
  offsetFactor = 0.05,
  maxAge = 500,
  pointCount = 50,
  speedMultiplier = 0.6,
  enableFade = false,
  enableShaderEffect = false,
  effectAmplitude = 2,
  backgroundColor = [0, 0, 0, 0],
  maxDpr = 2,
  className,
}: RibbonsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Live prop mirror.
   *
   * Everything the render loop reads goes through this ref, so changing a
   * colour never has to rebuild the GL context (see note 2 in the header).
   */
  const propsRef = useRef({
    colors,
    rainbow,
    hueSpeed,
    hueSpread,
    rainbowSaturation,
    rainbowLightness,
    backgroundColor,
  });
  propsRef.current = {
    colors,
    rainbow,
    hueSpeed,
    hueSpread,
    rainbowSaturation,
    rainbowLightness,
    backgroundColor,
  };

  // Serialised so array props compare by value, not by identity.
  const colorsKey = colors.join(',');
  const backgroundKey = backgroundColor.join(',');
  const count = ribbonCount ?? colors.length;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /**
     * A cursor-chasing paint trail is exactly the kind of large-area motion
     * that triggers vestibular symptoms. Under `prefers-reduced-motion` we do
     * not merely freeze the loop — we never create the GL context at all, so
     * the page also skips the shader compile and the extra memory.
     */
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, maxDpr),
      alpha: true,
    });
    const gl = renderer.gl;

    const bg = propsRef.current.backgroundColor;
    if (Array.isArray(bg) && bg.length === 4) {
      gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
    } else {
      gl.clearColor(0, 0, 0, 0);
    }

    const canvas = gl.canvas as HTMLCanvasElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    const scene = new Transform();
    const lines: Line[] = [];

    const vertex = /* glsl */ `
      precision highp float;

      attribute vec3 position;
      attribute vec3 next;
      attribute vec3 prev;
      attribute vec2 uv;
      attribute float side;

      uniform vec2 uResolution;
      uniform float uDPR;
      uniform float uThickness;
      uniform float uTime;
      uniform float uEnableShaderEffect;
      uniform float uEffectAmplitude;

      varying vec2 vUV;

      vec4 getPosition() {
          vec4 current = vec4(position, 1.0);
          vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
          vec2 nextScreen = next.xy * aspect;
          vec2 prevScreen = prev.xy * aspect;
          vec2 tangent = normalize(nextScreen - prevScreen);
          vec2 normal = vec2(-tangent.y, tangent.x);
          normal /= aspect;

          // --- Brush width profile -------------------------------------------
          // uv.y runs 0 at the head (right under the cursor) to 1 at the tail.
          // A round tip that widens immediately, then a long taper as the paint
          // runs out. Upstream used a symmetric lens shape, which looks like a
          // floating ribbon rather than a loaded brush.
          float t = uv.y;
          float tip = smoothstep(0.0, 0.07, t);
          float body = pow(1.0 - t, 0.75);
          normal *= mix(0.06, 1.0, tip * body);

          // Collapse the stroke while the cursor is still: with every point
          // stacked on the same spot the tangent is meaningless, and this keeps
          // the leftover blob from showing.
          float dist = length(nextScreen - prevScreen);
          normal *= smoothstep(0.0, 0.02, dist);

          float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
          float pixelWidth = current.w * pixelWidthRatio;
          normal *= pixelWidth * uThickness;
          current.xy -= normal * side;

          if (uEnableShaderEffect > 0.5) {
            current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
          }
          return current;
      }

      void main() {
          vUV = uv;
          gl_Position = getPosition();
      }
    `;

    const fragment = /* glsl */ `
      precision highp float;

      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uEnableFade;

      varying vec2 vUV;

      void main() {
          float fadeFactor = 1.0;
          if (uEnableFade > 0.5) {
              // Paint thinning out toward the end of the stroke.
              fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
          }
          gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
      }
    `;

    const { colors: liveColors, hueSpread: liveSpread } = propsRef.current;
    const center = (count - 1) / 2;

    for (let index = 0; index < count; index++) {
      const spring = baseSpring + (Math.random() - 0.5) * 0.05;
      const friction = baseFriction + (Math.random() - 0.5) * 0.05;
      const thickness = baseThickness + (Math.random() - 0.5) * 3;
      const mouseOffset = new Vec3(
        (index - center) * offsetFactor + (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.1,
        0,
      );

      const points: Vec3[] = [];
      for (let i = 0; i < pointCount; i++) points.push(new Vec3());

      const seedColor = liveColors[index % liveColors.length] ?? '#FFFFFF';

      const polyline = new Polyline(gl, {
        points,
        vertex,
        fragment,
        uniforms: {
          uColor: { value: new Color(seedColor) },
          uThickness: { value: thickness },
          uOpacity: { value: 1.0 },
          uTime: { value: 0.0 },
          uEnableShaderEffect: { value: enableShaderEffect ? 1.0 : 0.0 },
          uEffectAmplitude: { value: effectAmplitude },
          uEnableFade: { value: enableFade ? 1.0 : 0.0 },
        },
      });
      polyline.mesh.setParent(scene);

      lines.push({
        spring,
        friction,
        mouseVelocity: new Vec3(),
        mouseOffset,
        points,
        polyline,
        hueOffset: index * liveSpread,
      });
    }

    function resize() {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      lines.forEach((line) => line.polyline.resize());
    }
    resize();

    // ResizeObserver rather than a window listener: the hero also changes height
    // when fonts swap in or the copy reflows, neither of which fires `resize`.
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const mouse = new Vec3();
    let seeded = false;

    function updateMouse(event: MouseEvent | TouchEvent) {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      let clientX: number;
      let clientY: number;
      if ('changedTouches' in event) {
        const touch = event.changedTouches[0];
        if (!touch) return;
        clientX = touch.clientX;
        clientY = touch.clientY;
      } else {
        clientX = event.clientX;
        clientY = event.clientY;
      }

      const x = clientX - rect.left;
      const y = clientY - rect.top;
      mouse.set((x / rect.width) * 2 - 1, (y / rect.height) * -2 + 1, 0);

      // First sighting of the cursor: drop the whole ribbon onto that spot.
      // Without this the trail springs in from the origin and the first thing
      // the visitor sees is a stroke whipping across the hero.
      if (!seeded) {
        seeded = true;
        lines.forEach((line) => {
          line.points.forEach((point) => point.copy(mouse).add(line.mouseOffset));
          line.polyline.updateGeometry();
        });
      }
    }

    // On `window`, so the layer itself can stay pointer-transparent (note 1).
    // `passive` — these listeners never call preventDefault, and saying so lets
    // the browser keep scrolling off the main thread on touch devices.
    const listenerOptions: AddEventListenerOptions = { passive: true };
    window.addEventListener('mousemove', updateMouse, listenerOptions);
    window.addEventListener('touchstart', updateMouse, listenerOptions);
    window.addEventListener('touchmove', updateMouse, listenerOptions);

    /**
     * The loop only runs while the section is actually on screen and the tab is
     * focused. A landing page hero scrolls away after a second or two; keeping a
     * WebGL loop alive behind it is pure battery drain on the phones this page
     * is built for.
     */
    let onScreen = true;
    let frameId: number | null = null;
    let lastTime = performance.now();
    let hue = 0;

    const tmp = new Vec3();

    function update() {
      frameId = requestAnimationFrame(update);

      const currentTime = performance.now();
      // Clamped: after a tab regains focus `dt` can be enormous, which would
      // snap every trailing point onto the head in one frame.
      const dt = Math.min(currentTime - lastTime, 64);
      lastTime = currentTime;

      const live = propsRef.current;
      if (live.rainbow) hue = (hue + (live.hueSpeed * dt) / 1000) % 1;

      lines.forEach((line) => {
        const head = line.points[0];
        if (!head) return;

        // Spring the head toward the cursor, then let every following point
        // chase the one in front of it — that lag is what turns a moving
        // cursor into a trailing brush stroke.
        tmp.copy(mouse).add(line.mouseOffset).sub(head).multiply(line.spring);
        line.mouseVelocity.add(tmp).multiply(line.friction);
        head.add(line.mouseVelocity);

        const segmentDelay = maxAge / (line.points.length - 1);
        const timed = isFinite(maxAge) && maxAge > 0;
        const alpha = timed ? Math.min(1, (dt * speedMultiplier) / segmentDelay) : 0.9;

        for (let i = 1; i < line.points.length; i++) {
          const point = line.points[i];
          const previous = line.points[i - 1];
          if (!point || !previous) continue;
          point.lerp(previous, alpha);
        }

        const uniforms = line.polyline.mesh.program.uniforms;
        if (uniforms.uTime) uniforms.uTime.value = currentTime * 0.001;

        if (live.rainbow) {
          // Written in place — `Color` extends Array, so this avoids allocating
          // a fresh colour object for every ribbon on every frame.
          const [r, g, b] = hslToRgb(
            (hue + line.hueOffset) % 1,
            live.rainbowSaturation,
            live.rainbowLightness,
          );
          const color = uniforms.uColor.value as Color;
          color[0] = r;
          color[1] = g;
          color[2] = b;
        }

        line.polyline.updateGeometry();
      });

      renderer.render({ scene });
    }

    function start() {
      if (frameId !== null) return;
      lastTime = performance.now();
      frameId = requestAnimationFrame(update);
    }

    function stop() {
      if (frameId === null) return;
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    function syncRunning() {
      if (onScreen && document.visibilityState === 'visible') start();
      else stop();
    }

    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        onScreen = entry.isIntersecting;
        syncRunning();
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(container);

    document.addEventListener('visibilitychange', syncRunning);
    syncRunning();

    return () => {
      stop();
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', syncRunning);
      window.removeEventListener('mousemove', updateMouse);
      window.removeEventListener('touchstart', updateMouse);
      window.removeEventListener('touchmove', updateMouse);

      if (canvas.parentNode === container) container.removeChild(canvas);

      // Hand the GPU context back explicitly (note 3). Without this, navigating
      // between pages a dozen times exhausts the browser's WebGL context pool
      // and every later canvas silently fails to initialise.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [
    colorsKey,
    backgroundKey,
    count,
    baseSpring,
    baseFriction,
    baseThickness,
    offsetFactor,
    maxAge,
    pointCount,
    speedMultiplier,
    enableFade,
    enableShaderEffect,
    effectAmplitude,
    maxDpr,
  ]);

  return <div ref={containerRef} className={['ribbons-container', className].filter(Boolean).join(' ')} aria-hidden />;
}

export default Ribbons;
