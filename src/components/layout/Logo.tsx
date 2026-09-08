import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/cn';

interface LogoProps {
  className?: string;
  /** `mark` = the wordmark on a transparent background, `disc` = the round badge. */
  variant?: 'mark' | 'disc';
  /** Rendered width in px. Height follows the intrinsic aspect ratio. */
  width?: number;
  /** Links to the top of the page unless disabled (e.g. inside the footer). */
  href?: string | null;
  /**
   * `white` swaps in the knocked-out mono artwork for dark backgrounds.
   *
   * A real second file rather than a CSS `brightness(0) invert(1)` filter: the
   * filter floods the yellow badge into a solid white rectangle, because a
   * filter cannot know that the "lab" letters are meant to stay cut out.
   */
  tone?: 'colour' | 'white';
  /**
   * Preload this image and opt it out of lazy loading.
   *
   * OFF by default, and that default matters. `priority` emits a
   * <link rel="preload" as="image"> with a full srcset into <head>. When it was
   * hardcoded on, the footer's disc logo — which is below the fold on every
   * screen — competed for bandwidth with the hero during the initial paint.
   * Only the header logo is genuinely part of the first screen.
   */
  priority?: boolean;
}

/**
 * Brand mark.
 *
 * Both assets were cut directly out of the supplied logo file: the wordmark is
 * background-removed with an edge-preserving flood fill (so the white "lab"
 * letters and the ornament inside the "ö" survive), and the disc is the full
 * circular badge.
 */
export function Logo({
  className,
  variant = 'mark',
  width = 148,
  href = '/',
  priority = false,
  tone = 'colour',
}: LogoProps) {
  const isDisc = variant === 'disc';
  const src = isDisc
    ? '/logo.png'
    : tone === 'white'
      ? '/logo-wordmark-white.png'
      : '/logo-wordmark.png';
  // Regenerated from the 9000x8000 master, cropped to the ink bounds.
  const intrinsic = isDisc ? { w: 484, h: 484 } : { w: 1200, h: 568 };
  const height = Math.round((width * intrinsic.h) / intrinsic.w);

  const image = (
    <Image
      src={src}
      alt="OnerLab — академия живописи для детей"
      width={width}
      height={height}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      sizes={`${width}px`}
      className={cn('h-auto w-auto select-none', className)}
      style={{ width, height }}
    />
  );

  if (!href) return image;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="OnerLab — на главную">
      {image}
    </Link>
  );
}
