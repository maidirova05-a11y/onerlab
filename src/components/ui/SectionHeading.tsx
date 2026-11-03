import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';
import { Reveal } from '@/components/ui/Reveal';

interface SectionHeadingProps {
  /** Small kicker above the title, e.g. «Преимущества». */
  label: string;
  title: ReactNode;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

/**
 * Consistent section header. Extracted so the eyebrow/title/subtitle rhythm is
 * identical in all five sections — the alternative is six slightly different
 * heading blocks that drift apart over time.
 */
export function SectionHeading({
  label,
  title,
  subtitle,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
        {/* Small yellow tick marks the section — a highlight, not decoration. */}
        <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
        {label}
      </span>

      <h2 className="mt-4 text-3xl font-semibold leading-[1.15] text-ink sm:text-4xl lg:text-[2.75rem]">
        {title}
      </h2>

      {subtitle ? (
        <p className="mt-4 text-base leading-relaxed text-ink-soft sm:text-lg">{subtitle}</p>
      ) : null}
    </Reveal>
  );
}
