import type { ElementType, ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** `wide` relaxes the max width for full-bleed-ish sections like the gallery. */
  size?: 'default' | 'wide' | 'narrow';
}

const SIZES = {
  narrow: 'max-w-3xl',
  default: 'max-w-6xl',
  wide: 'max-w-7xl',
} as const;

/**
 * The single horizontal-rhythm primitive. Every section uses it, so gutters
 * stay identical across the page instead of drifting section by section.
 * Mobile-first: 20px gutters on phones, opening up from `sm` upward.
 */
export function Container({ children, className, as: Tag = 'div', size = 'default' }: ContainerProps) {
  return <Tag className={cn('mx-auto w-full px-5 sm:px-6 lg:px-8', SIZES[size], className)}>{children}</Tag>;
}
