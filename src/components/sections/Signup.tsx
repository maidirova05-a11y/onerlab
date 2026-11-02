import { LeadForm } from '@/components/form/LeadForm';
import { CheckIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons';
import { Container } from '@/components/ui/Container';
import { Reveal } from '@/components/ui/Reveal';
import { contacts, leadForm, pricing } from '@/content/site';
import { env } from '@/lib/env';
import type { CaptchaProvider } from '@/components/form/CaptchaWidget';

/**
 * «Форма записи» — the conversion section.
 *
 * This is a Server Component: it reads the validated environment and hands the
 * client form only what the browser is allowed to see (provider name + PUBLIC
 * site key). `CAPTCHA_SECRET_KEY` is never referenced on this side of the tree,
 * so it cannot end up in the client bundle even by accident.
 */
export function Signup() {
  const captcha = {
    provider: env.CAPTCHA_PROVIDER as CaptchaProvider,
    siteKey: env.NEXT_PUBLIC_CAPTCHA_SITE_KEY,
  };

  return (
    <section id="signup" className="relative scroll-mt-24 py-16 sm:py-20 lg:py-24">
      <Container size="wide">
        <div className="relative overflow-hidden rounded-[2rem] border border-line bg-canvas-alt p-6 sm:p-10 lg:p-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-16">
            {/* --- Pitch column --- */}
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft">
                  <span aria-hidden className="h-2 w-2 rounded-full bg-brand" />
                  {leadForm.sectionLabel}
                </span>

                <h2 className="mt-4 text-3xl font-semibold leading-[1.15] text-ink sm:text-4xl">
                  Запишите ребенка на пробный урок за{' '}
                  <span className="brush-underline whitespace-nowrap">{pricing.trialLabel}</span>
                </h2>
              </Reveal>

              {/* The objection-handling copy the brief asks for. */}
              <Reveal delay={90}>
                <p className="mt-5 text-base leading-relaxed text-ink-soft sm:text-lg">
                  {leadForm.disclaimer}
                </p>
              </Reveal>

              <Reveal delay={160}>
                <ul className="mt-8 space-y-3.5">
                  {[
                    'Перезвоним в течение рабочего дня',
                    'Подберём удобное время из свободных групп',
                    'Все материалы для пробного урока — с нас',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand">
                        <CheckIcon className="h-3 w-3 text-ink" />
                      </span>
                      <span className="text-sm font-medium text-ink sm:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={230}>
                <div className="mt-9 border-t border-line-strong pt-7">
                  <p className="text-sm font-semibold text-ink-muted">
                    Удобнее написать или позвонить?
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a
                      href={`tel:${contacts.phoneE164}`}
                      className="inline-flex h-11 items-center gap-2 rounded-pill border-2 border-line-strong bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:border-ink"
                    >
                      <PhoneIcon className="h-4 w-4 text-brand-strong" />
                      {contacts.phoneDisplay}
                    </a>
                    <a
                      href={contacts.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-pill border-2 border-line-strong bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:border-ink"
                    >
                      <WhatsAppIcon className="h-4 w-4 text-brand-strong" />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* --- Form column --- */}
            <Reveal delay={120}>
              <div className="rounded-card border border-line bg-canvas p-6 shadow-[0_8px_24px_rgba(51,51,51,0.06)] sm:p-8">
                <p className="mb-6 font-display text-xl font-semibold text-ink">{leadForm.formLabel}</p>
                <LeadForm captcha={captcha} />
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
