'use client';

import { useEffect, useState } from 'react';

import { Logo } from '@/components/layout/Logo';
import { CloseIcon, MenuIcon, PhoneIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { contacts, hero, nav } from '@/content/site';
import { cn } from '@/lib/cn';

/**
 * Sticky site header.
 *
 * Mobile-first: on phones it is logo + call button + burger, because that is
 * all that fits and "call us" is the highest-intent action a parent takes from
 * a phone. The nav links and the yellow CTA appear from `lg` upward.
 */
export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Solidify the header background once the page scrolls away from the hero.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // While the mobile drawer is open: lock body scroll and allow Esc to close.
  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <header
      /*
        DESKTOP: hidden while the opening screen is on show, revealed on scroll.
        The hero already states the brand at full size, so a nav bar on top of it
        is redundant and competes with the mark.

        MOBILE: always visible. The burger is the only way to reach the menu, so
        hiding the bar removes navigation entirely rather than merely tidying it.

        `focus-within` is the escape hatch: a keyboard user who tabs from the
        skip link at the very top would otherwise be focusing links they cannot
        see, so any focus inside brings the whole bar back.
      */
      className={cn(
        'group fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-paint',
        'border-b bg-canvas/90 backdrop-blur-md',
        scrolled
          ? 'translate-y-0 border-line opacity-100 shadow-[0_1px_20px_rgba(51,51,51,0.06)]'
          // Hidden only from `lg` up. On a phone the bar IS the navigation —
          // the burger lives in it — so hiding it leaves the first screen with
          // nothing to tap but the CTA, which reads as a dead page.
          : 'translate-y-0 border-transparent opacity-100 lg:pointer-events-none lg:-translate-y-full lg:opacity-0 lg:focus-within:pointer-events-auto lg:focus-within:translate-y-0 lg:focus-within:opacity-100',
      )}
    >
      <Container size="wide">
        <div
          className={cn(
            'flex items-center justify-between gap-4 transition-all duration-300',
            scrolled ? 'h-16' : 'h-20',
          )}
        >
          {/* Logo — left, per brief */}
          <Logo width={scrolled ? 112 : 128} priority className="transition-all duration-300" />

          {/* Desktop navigation */}
          <nav aria-label="Основная навигация" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="relative rounded-pill px-3.5 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-alt hover:text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right side — phone number, per brief */}
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={`tel:${contacts.phoneE164}`}
              className="hidden items-center gap-2 rounded-pill px-3 py-2 text-sm font-bold text-ink transition-colors hover:bg-canvas-alt md:inline-flex"
            >
              <PhoneIcon className="h-4 w-4 text-brand-strong" />
              {contacts.phoneDisplay}
            </a>

            {/* Compact icon-only call button on phones. `shrink-0` guarantees the
                44px touch target survives even if a neighbour grows. */}
            <a
              href={`tel:${contacts.phoneE164}`}
              aria-label={`Позвонить ${contacts.phoneDisplay}`}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill border-2 border-line-strong text-ink transition-colors hover:border-ink md:hidden"
            >
              <PhoneIcon className="h-5 w-5" />
            </a>

            {/*
              Responsive visibility lives on a WRAPPER, not on the Button's
              `className`. `Button` already sets `inline-flex` in its base
              classes, and Tailwind resolves two utilities from the same
              property group by their order in the generated stylesheet — not by
              the order they appear in the class attribute. Passing
              `hidden lg:inline-flex` therefore loses to the base `inline-flex`
              and the button stays visible on phones. See the note in lib/cn.ts.
            */}
            <div className="hidden lg:block">
              <Button href="#signup">{hero.primaryCta}</Button>
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-ink transition-colors hover:bg-canvas-alt lg:hidden"
            >
              {menuOpen ? <MenuIconSwap open /> : <MenuIconSwap />}
            </button>
          </div>
        </div>
      </Container>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!menuOpen}
        className="border-t border-line bg-canvas lg:hidden"
      >
        <Container size="wide">
          <nav aria-label="Мобильная навигация" className="py-4">
            <ul className="flex flex-col">
              {nav.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block border-b border-line py-3.5 text-base font-semibold text-ink"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>

            {/* Wrapper handles closing the drawer; Button stays a pure link. */}
            <div className="mt-5" onClick={() => setMenuOpen(false)}>
              <Button href="#signup" size="lg" fullWidth>
                {hero.primaryCta}
              </Button>
            </div>

            <a
              href={`tel:${contacts.phoneE164}`}
              className="mt-3 flex items-center justify-center gap-2 py-2 text-base font-bold text-ink"
            >
              <PhoneIcon className="h-5 w-5 text-brand-strong" />
              {contacts.phoneDisplay}
            </a>
          </nav>
        </Container>
      </div>
    </header>
  );
}

/** Keeps both glyphs mounted so the swap cannot cause a layout jump. */
function MenuIconSwap({ open = false }: { open?: boolean }) {
  return open ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />;
}
