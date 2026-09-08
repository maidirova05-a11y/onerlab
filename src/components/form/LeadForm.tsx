'use client';

import Link from 'next/link';
import { useCallback, useId, useRef, useState, type FormEvent } from 'react';

import { ArrowRightIcon, CheckIcon, PhoneIcon } from '@/components/icons';
import { Button } from '@/components/ui/Button';
import {
  CaptchaWidget,
  type CaptchaHandle,
  type CaptchaProvider,
} from '@/components/form/CaptchaWidget';
import { contacts, leadForm } from '@/content/site';
import { cn } from '@/lib/cn';
import { formatPhoneAsTyped } from '@/lib/phone-mask';
import { leadFormSchema, toFieldErrors, type LeadFormInput } from '@/validation/lead.schema';

/**
 * =============================================================================
 * Trial-lesson request form.
 * =============================================================================
 * Validation runs against `leadFormSchema` — the exact same Zod schema the API
 * route uses. That is a deliberate architectural choice: there is no second set
 * of rules to keep in sync, and the client-side pass is understood to be a UX
 * convenience only. Nothing here is a security control; every rule is enforced
 * again on the server, where the user cannot reach it.
 * =============================================================================
 */

type Status = 'idle' | 'submitting' | 'success' | 'error';

const EMPTY_FORM: LeadFormInput = {
  parentName: '',
  childNameAge: '',
  school: '',
  phone: '',
  consent: false,
  website: '',
};

interface LeadFormProps {
  /**
   * Injected by the parent Server Component. Keeping this a prop — rather than
   * reading env inside the client bundle — is what guarantees only the PUBLIC
   * site key ever crosses to the browser.
   */
  captcha: { provider: CaptchaProvider; siteKey: string };
}

export function LeadForm({ captcha }: LeadFormProps) {
  const [values, setValues] = useState<LeadFormInput>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  const captchaRef = useRef<CaptchaHandle | null>(null);
  const formId = useId();
  const errorSummaryId = `${formId}-error`;

  const setField = useCallback(
    <K extends keyof LeadFormInput>(key: K, value: LeadFormInput[K]) => {
      setValues((previous) => ({ ...previous, [key]: value }));
      // Clear a field's error as soon as the visitor starts fixing it —
      // leaving stale red text under an input they are actively editing is
      // the fastest way to make a form feel hostile.
      setFieldErrors((previous) => {
        if (!(key in previous)) return previous;
        const next = { ...previous };
        delete next[key as string];
        return next;
      });
    },
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'submitting') return;

    setFormError(null);

    // --- 1. Client-side validation (same schema as the server) --------------
    const parsed = leadFormSchema.safeParse(values);
    if (!parsed.success) {
      const errors = toFieldErrors(parsed.error);
      setFieldErrors(errors);
      setStatus('error');
      // Move focus to the first bad field so keyboard/screen-reader users are
      // not left guessing what went wrong.
      const firstKey = Object.keys(errors)[0];
      if (firstKey) document.getElementById(`${formId}-${firstKey}`)?.focus();
      return;
    }

    setStatus('submitting');
    setFieldErrors({});

    try {
      // --- 2. Obtain a fresh CAPTCHA token -----------------------------------
      // Resolves to `undefined` when no provider is configured, which the
      // server treats as "verification skipped" in development only.
      const captchaToken = await captchaRef.current?.getToken();

      // --- 3. Submit ---------------------------------------------------------
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `same-origin` keeps this request from ever being sent cross-site.
        credentials: 'same-origin',
        body: JSON.stringify({ ...parsed.data, captchaToken }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { success: boolean; error?: { message?: string; fields?: Record<string, string> } }
        | null;

      if (!response.ok || !payload?.success) {
        // The server only ever returns curated messages, so it is safe to show
        // this string directly to the visitor.
        if (payload?.error?.fields) setFieldErrors(payload.error.fields);
        setFormError(payload?.error?.message ?? leadForm.genericError);
        setStatus('error');
        captchaRef.current?.reset();
        return;
      }

      setStatus('success');
      setValues(EMPTY_FORM);
      captchaRef.current?.reset();
    } catch {
      // Network failure, offline, request aborted.
      setFormError(leadForm.genericError);
      setStatus('error');
      captchaRef.current?.reset();
    }
  }

  if (status === 'success') {
    return <SuccessPanel onReset={() => setStatus('idle')} />;
  }

  const busy = status === 'submitting';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-describedby={formError ? errorSummaryId : undefined}
      className="space-y-5"
    >
      {/*
        HONEYPOT. Positioned off-screen rather than `display:none`, because some
        bots skip hidden inputs but almost none compute layout. `tabIndex={-1}`
        and `aria-hidden` keep it away from keyboard and screen-reader users.
      */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor={`${formId}-website`}>Не заполняйте это поле</label>
        <input
          id={`${formId}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={values.website ?? ''}
          onChange={(event) => setField('website', event.target.value)}
        />
      </div>

      <Field
        id={`${formId}-parentName`}
        label={leadForm.fields.parentName.label}
        placeholder={leadForm.fields.parentName.placeholder}
        value={values.parentName}
        onChange={(value) => setField('parentName', value)}
        error={fieldErrors.parentName}
        autoComplete="name"
        maxLength={80}
        disabled={busy}
        required
      />

      <Field
        id={`${formId}-childNameAge`}
        label={leadForm.fields.childNameAge.label}
        placeholder={leadForm.fields.childNameAge.placeholder}
        value={values.childNameAge}
        onChange={(value) => setField('childNameAge', value)}
        error={fieldErrors.childNameAge}
        maxLength={120}
        disabled={busy}
        required
      />

      <Field
        id={`${formId}-school`}
        label={leadForm.fields.school.label}
        placeholder={leadForm.fields.school.placeholder}
        value={values.school}
        onChange={(value) => setField('school', value)}
        error={fieldErrors.school}
        maxLength={120}
        disabled={busy}
        required
      />

      <Field
        id={`${formId}-phone`}
        label={leadForm.fields.phone.label}
        placeholder={leadForm.fields.phone.placeholder}
        value={values.phone}
        // Progressive mask: formats as the visitor types without ever blocking
        // a keystroke, so paste and backspace still behave normally.
        onChange={(value) => setField('phone', formatPhoneAsTyped(value))}
        error={fieldErrors.phone}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        maxLength={20}
        disabled={busy}
        required
        icon={<PhoneIcon className="h-5 w-5 text-ink-faint" />}
      />

      {/* Consent — required for lawful processing, and links to the policy. */}
      <div>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            id={`${formId}-consent`}
            type="checkbox"
            checked={values.consent}
            onChange={(event) => setField('consent', event.target.checked)}
            disabled={busy}
            aria-invalid={Boolean(fieldErrors.consent)}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-2 border-line-strong accent-[#FAC90A]"
          />
          <span className="text-sm leading-relaxed text-ink-soft">
            {leadForm.consent.prefix}{' '}
            <Link href="/privacy" className="font-semibold text-ink underline underline-offset-2">
              {leadForm.consent.linkLabel}
            </Link>
          </span>
        </label>
        {fieldErrors.consent ? (
          <p role="alert" className="mt-1.5 text-sm font-medium text-danger">
            {fieldErrors.consent}
          </p>
        ) : null}
      </div>

      {/* Bot protection. Renders nothing when CAPTCHA_PROVIDER is "none". */}
      <CaptchaWidget
        ref={captchaRef}
        provider={captcha.provider}
        siteKey={captcha.siteKey}
        action="lead_form"
      />

      {formError ? (
        <p
          id={errorSummaryId}
          role="alert"
          className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" size="lg" fullWidth disabled={busy}>
        {busy ? (
          leadForm.submitting
        ) : (
          <>
            {leadForm.submit}
            <ArrowRightIcon className="h-5 w-5" />
          </>
        )}
      </Button>

      <p className="text-center text-xs leading-relaxed text-ink-muted">{leadForm.privacyNote}</p>
    </form>
  );
}

/* -------------------------------------------------------------------------- */

interface FieldProps {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: 'text' | 'tel' | 'numeric';
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  required?: boolean;
  /** Shown next to the label, e.g. "необязательно". */
  hint?: string;
  icon?: React.ReactNode;
}

/** Labelled text input with inline error messaging wired up for a11y. */
function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
  autoComplete,
  maxLength,
  disabled,
  required,
  hint,
  icon,
}: FieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-bold text-ink">
        {label}
        {required ? (
          <span aria-hidden className="ml-1 text-brand-strong">
            *
          </span>
        ) : null}
        {/* Spelled out rather than left to the missing asterisk — "optional" is
            easier to act on than the absence of a mark you have to notice. */}
        {hint ? <span className="ml-2 font-medium text-ink-faint">({hint})</span> : null}
      </label>

      <div className="relative">
        {icon ? (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">{icon}</span>
        ) : null}

        <input
          id={id}
          name={id}
          type={type}
          inputMode={inputMode}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          // `aria-invalid` + `aria-describedby` are what make the error text
          // actually reach a screen-reader user, not just a sighted one.
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          className={cn(
            'h-14 w-full rounded-2xl border-2 bg-canvas px-4 text-base text-ink transition-colors',
            'placeholder:text-ink-faint disabled:cursor-not-allowed disabled:bg-canvas-alt',
            icon && 'pl-12',
            error
              ? 'border-danger focus:border-danger'
              : 'border-line-strong hover:border-ink-faint focus:border-ink',
          )}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Confirmation state shown in place of the form after a successful submit. */
function SuccessPanel({ onReset }: { onReset: () => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-card border-2 border-brand bg-brand-faint p-8 text-center sm:p-10"
    >
      <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-brand">
        <CheckIcon className="h-8 w-8 text-ink" />
      </span>

      <h3 className="mt-6 font-display text-2xl font-extrabold text-ink">
        {leadForm.success.title}
      </h3>
      <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-ink-soft">
        {leadForm.success.text}
      </p>

      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button href={`tel:${contacts.phoneE164}`} variant="dark" size="md">
          <PhoneIcon className="h-4 w-4" />
          {contacts.phoneDisplay}
        </Button>
        <button
          type="button"
          onClick={onReset}
          className="text-sm font-semibold text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
        >
          {leadForm.success.again}
        </button>
      </div>
    </div>
  );
}
