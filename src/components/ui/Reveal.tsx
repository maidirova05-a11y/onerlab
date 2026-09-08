'use client';

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { registerReveal } from '@/lib/reveal-controller';

interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Stagger, in ms, so a grid of cards settles one after another. */
  delay?: number;
}

/**
 * Scroll-reveal wrapper.
 *
 * The animation itself lives in globals.css (`[data-reveal]`), so it is
 * disabled automatically under `prefers-reduced-motion`. All the scheduling is
 * delegated to a single shared controller — see `lib/reveal-controller.ts` for
 * why that matters (one observer for the whole page, plus a geometry fallback
 * that guarantees content is never left permanently invisible).
 */
export function Reveal({ children, className, as: Tag = 'div', delay = 0 }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return registerReveal(node, () => setRevealed(true));
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-revealed={revealed ? 'true' : 'false'}
      style={{ '--reveal-delay': `${delay}ms` } as CSSProperties}
      className={cn(className)}
    >
      {children}
    </Tag>
  );
}
