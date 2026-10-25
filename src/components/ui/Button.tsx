import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'dark';
type Size = 'md' | 'lg';

// `rounded-pill` / `ease-paint` come from the --radius-* and --ease-* tokens
// declared in the `@theme` block of globals.css — Tailwind v4 turns those into
// real utilities, so the design tokens stay in one place.
const BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-pill ' +
  'transition-all duration-200 ease-paint select-none text-center ' +
  'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0';

/**
 * Yellow is reserved for `primary` only — it is the single loudest colour on
 * the page, so if more than one thing on a screen is yellow, none of them read
 * as "the" action. Every other variant is grey/white.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand text-ink shadow-[0_6px_0_-1px_var(--color-brand-strong)] ' +
    'hover:bg-brand-strong hover:shadow-[0_4px_0_-1px_#c99e00] hover:-translate-y-0.5 ' +
    'active:shadow-[0_2px_0_-1px_#c99e00]',
  secondary: 'bg-canvas text-ink border-2 border-line-strong hover:border-ink hover:bg-canvas-alt',
  ghost: 'text-ink-soft hover:text-ink hover:bg-canvas-alt',
  dark: 'bg-ink text-white hover:bg-black',
};

const SIZES: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  // Comfortably above the 44px minimum touch target — parents tap this on a phone.
  lg: 'h-14 px-7 text-base sm:text-lg',
};

interface CommonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Stretch to the container width — the default on mobile for the main CTA. */
  fullWidth?: boolean;
}

type ButtonAsButton = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  /** External links get `rel="noopener noreferrer"` automatically — see below. */
  external?: boolean;
  'aria-label'?: string;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { children, variant = 'primary', size = 'md', className, fullWidth } = props;

  const classes = cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);

  if ('href' in props && props.href !== undefined) {
    const { href, external, ...rest } = props as ButtonAsLink;
    const isExternal = external ?? (/^(https?:)?\/\//.test(href) || href.startsWith('tel:'));

    if (isExternal) {
      return (
        <a
          href={href}
          className={classes}
          // SECURITY: `noopener` stops the opened page from reaching back through
          // `window.opener`; `noreferrer` stops us leaking the referring URL.
          {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          aria-label={rest['aria-label']}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} aria-label={rest['aria-label']}>
        {children}
      </Link>
    );
  }

  // Destructured only to strip them from the props forwarded to <button>.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { children: _children, variant: _v, size: _s, className: _c, fullWidth: _f, ...buttonProps } =
    props as ButtonAsButton;

  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
