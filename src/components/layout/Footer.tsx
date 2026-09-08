import Link from 'next/link';

import { InstagramIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '@/components/icons';
import { Logo } from '@/components/layout/Logo';
import { Container } from '@/components/ui/Container';
import { contacts, footer, nav } from '@/content/site';

/**
 * Site footer — also the "Контакты" anchor target from the navigation.
 * Dark grey (#333333) so the yellow accents and the white logo disc both sit
 * cleanly against it.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer id="contacts" className="scroll-mt-24 bg-ink text-white">
      <Container size="wide" className="py-14 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          {/* Brand block */}
          <div>
            {/* The circular badge reads better than the wordmark on a dark ground. */}
            <Logo tone="white" width={150} href={null} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/70">{footer.tagline}</p>

            <div className="mt-6 flex items-center gap-3">
              <a
                href={contacts.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram ${contacts.instagramHandle}`}
                className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-white/20 text-white transition-colors hover:border-brand hover:text-brand"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href={contacts.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-pill border border-white/20 px-4 text-sm font-semibold text-white transition-colors hover:border-brand hover:text-brand"
              >
                <WhatsAppIcon className="h-5 w-5" />
                {footer.writeUs}
              </a>
            </div>
          </div>

          {/* Contacts */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-brand">
              {footer.contactsLabel}
            </h2>
            {/* `min-h-11` keeps each contact link at a 44px touch target on phones. */}
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <a
                  href={`tel:${contacts.phoneE164}`}
                  className="inline-flex min-h-11 items-center gap-3 font-bold text-white transition-colors hover:text-brand"
                >
                  <PhoneIcon className="h-5 w-5 shrink-0 text-brand" />
                  {contacts.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={contacts.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-3 text-white/80 transition-colors hover:text-brand"
                >
                  <InstagramIcon className="h-5 w-5 shrink-0 text-brand" />
                  {contacts.instagramHandle}
                </a>
              </li>
              <li className="inline-flex min-h-11 items-center gap-3 text-white/80">
                <PinIcon className="h-5 w-5 shrink-0 text-brand" />
                {contacts.city}
              </li>
            </ul>
          </div>

          {/* Navigation + legal */}
          <div className="grid grid-cols-2 gap-8 lg:block">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-brand">
                {footer.navLabel}
              </h2>
              <ul className="mt-3 space-y-0.5 text-sm">
                {nav.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-flex min-h-10 items-center text-white/80 transition-colors hover:text-brand"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:mt-8">
              <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-brand lg:sr-only">
                {footer.legalLabel}
              </h2>
              <ul className="mt-3 space-y-0.5 text-sm lg:mt-1">
                <li>
                  <Link
                    href="/privacy"
                    className="inline-flex min-h-10 items-center text-white/80 transition-colors hover:text-brand"
                  >
                    {footer.privacyLabel}
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {contacts.legalName}. {footer.rightsReserved}
          </p>
          <p>{contacts.city}, Казахстан</p>
        </div>
      </Container>
    </footer>
  );
}
