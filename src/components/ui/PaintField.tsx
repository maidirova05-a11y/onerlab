/**
 * The page-wide paint field.
 *
 * Replaces the blobs that used to live inside the hero. Those ended at the hero's
 * bottom edge, which — together with the alternating solid section backgrounds —
 * cut the page into visible horizontal bands.
 *
 * Two rules keep it reading as one continuous surface:
 *
 *   1. POSITIONS ARE PERCENTAGES OF THE WHOLE DOCUMENT, not of a section. The
 *      field is stretched over the entire page, so the blobs redistribute as
 *      the page grows and never line up with a section boundary.
 *
 *   2. NOTHING REPEATS. Vertical spacing is deliberately irregular (never a
 *      constant step), and size, side, tone, softness and shape all vary. A
 *      regular rhythm is what makes a decorative layer look tiled.
 *
 * Rendered once in the root layout, so every page gets it. Pure CSS, no
 * client JavaScript.
 */

/**
 * The canonical description of the field.
 *
 * Only `top` is read at runtime (as a React key); the rest is the source these
 * blobs' CSS rules were generated from, kept here so the composition can be
 * read and re-tuned in one place. Change a value here and update the matching
 * `.paint-blob-N` rule in globals.css.
 */
interface Blob {
  /** Distance down the whole document. */
  top: string;
  left?: string;
  right?: string;
  /** Diameter — viewport-relative so it scales sensibly on phones. */
  size: string;
  tone: 'brand' | 'soft' | 'ink';
  opacity: number;
  blur: number;
}

/**
 * Hand-placed rather than generated: a fixed list renders identically on the
 * server and the client, and lets the composition be tuned by eye instead of
 * hoping a random seed lands well.
 */
const BLOBS: Blob[] = [
  { top: '0.5%', left: '-10%', size: 'clamp(240px, 34vw, 460px)', tone: 'brand', opacity: 0.26, blur: 40 },
  { top: '3%', right: '-6%', size: 'clamp(200px, 30vw, 420px)', tone: 'ink', opacity: 0.05, blur: 46 },
  { top: '7%', left: '38%', size: 'clamp(150px, 20vw, 280px)', tone: 'brand', opacity: 0.13, blur: 38 },
  { top: '12%', right: '8%', size: 'clamp(180px, 24vw, 340px)', tone: 'soft', opacity: 0.55, blur: 44 },
  { top: '17%', left: '-6%', size: 'clamp(160px, 22vw, 300px)', tone: 'brand', opacity: 0.1, blur: 42 },
  { top: '23%', right: '32%', size: 'clamp(130px, 17vw, 240px)', tone: 'ink', opacity: 0.045, blur: 36 },
  { top: '28%', left: '12%', size: 'clamp(200px, 27vw, 380px)', tone: 'brand', opacity: 0.15, blur: 48 },
  { top: '34%', right: '-8%', size: 'clamp(220px, 30vw, 420px)', tone: 'soft', opacity: 0.5, blur: 46 },
  { top: '40%', left: '46%', size: 'clamp(140px, 18vw, 250px)', tone: 'brand', opacity: 0.09, blur: 34 },
  { top: '45%', left: '-9%', size: 'clamp(190px, 26vw, 360px)', tone: 'brand', opacity: 0.19, blur: 44 },
  { top: '51%', right: '14%', size: 'clamp(150px, 20vw, 280px)', tone: 'ink', opacity: 0.05, blur: 40 },
  { top: '57%', left: '24%', size: 'clamp(170px, 23vw, 310px)', tone: 'soft', opacity: 0.45, blur: 42 },
  { top: '63%', right: '-7%', size: 'clamp(210px, 28vw, 400px)', tone: 'brand', opacity: 0.16, blur: 48 },
  { top: '69%', left: '4%', size: 'clamp(140px, 19vw, 260px)', tone: 'brand', opacity: 0.11, blur: 36 },
  { top: '75%', right: '36%', size: 'clamp(160px, 21vw, 290px)', tone: 'ink', opacity: 0.04, blur: 38 },
  { top: '81%', left: '-8%', size: 'clamp(200px, 27vw, 370px)', tone: 'soft', opacity: 0.5, blur: 46 },
  { top: '87%', right: '6%', size: 'clamp(180px, 25vw, 330px)', tone: 'brand', opacity: 0.14, blur: 44 },
  { top: '93%', left: '30%', size: 'clamp(150px, 20vw, 270px)', tone: 'brand', opacity: 0.09, blur: 40 },
];

export function PaintField() {
  return (
    /*
      `overflow-hidden` matters: several blobs sit deliberately off the left and
      right edges so they read as bleeding past the page rather than floating,
      and without clipping they would create a horizontal scrollbar.
    */
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {BLOBS.map((blob, i) => (
        // Geometry lives in `.paint-blob-N` in globals.css, not in a style
        // attribute — see the comment above that block for why.
        <span key={`${blob.top}-${i}`} className={`paint-blob paint-blob-${i}`} />
      ))}
    </div>
  );
}
