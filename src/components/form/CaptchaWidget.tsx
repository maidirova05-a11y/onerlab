'use client';

import Script from 'next/script';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type CaptchaProvider = 'turnstile' | 'recaptcha' | 'none';

export interface CaptchaHandle {
  /** Resolves to a fresh token, or `undefined` when no provider is configured. */
  getToken: () => Promise<string | undefined>;
  /** Invalidates the current token — call after every submit, success or not. */
  reset: () => void;
}

interface CaptchaWidgetProps {
  provider: CaptchaProvider;
  siteKey: string;
  /** reCAPTCHA v3 action name — shows up in the provider's analytics. */
  action?: string;
}

/**
 * =============================================================================
 * Bot protection widget — Cloudflare Turnstile or Google reCAPTCHA v3.
 * =============================================================================
 * Provider and site key are passed down from a Server Component, so the SECRET
 * key never enters the client bundle; only the public site key does.
 *
 * The token produced here proves nothing on its own. It is meaningful only once
 * `POST /api/leads` has verified it against the provider's siteverify endpoint
 * (see `src/lib/captcha.ts`) — a client-side "success" is trivially forged.
 *
 * When `provider === 'none'` this renders nothing and `getToken()` resolves to
 * `undefined`. That is the development default; `src/lib/env.ts` warns loudly
 * if the app boots into production in that state.
 * =============================================================================
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
          language?: string;
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

/** How long to wait for a Turnstile challenge to produce a token. */
const TOKEN_TIMEOUT_MS = 20_000;

export const CaptchaWidget = forwardRef<CaptchaHandle, CaptchaWidgetProps>(function CaptchaWidget(
  { provider, siteKey, action = 'submit' },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const isConfigured = provider !== 'none' && siteKey.length > 0;

  // --- Turnstile: render the managed widget once its script has loaded -------
  useEffect(() => {
    if (provider !== 'turnstile' || !scriptReady || !containerRef.current) return;
    if (widgetIdRef.current !== null) return;
    if (!window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'light',
      size: 'flexible',
      language: 'ru',
      callback: (token) => {
        tokenRef.current = token;
      },
      'expired-callback': () => {
        tokenRef.current = null;
      },
      'error-callback': () => {
        tokenRef.current = null;
      },
    });

    const widgetId = widgetIdRef.current;
    return () => {
      // Clean up on unmount so a re-mount does not stack duplicate widgets.
      if (widgetId) window.turnstile?.remove(widgetId);
      widgetIdRef.current = null;
    };
  }, [provider, scriptReady, siteKey]);

  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (!isConfigured) return undefined;

    if (provider === 'recaptcha') {
      // v3 is invisible: a token is minted on demand, per action.
      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) return undefined;
      return new Promise<string | undefined>((resolve) => {
        grecaptcha.ready(() => {
          grecaptcha
            .execute(siteKey, { action })
            .then(resolve)
            .catch(() => resolve(undefined));
        });
      });
    }

    // Turnstile: the token arrives via the widget callback. If the challenge is
    // still running, wait for it rather than submitting without a token.
    if (tokenRef.current) return tokenRef.current;

    return new Promise<string | undefined>((resolve) => {
      const startedAt = Date.now();
      const poll = window.setInterval(() => {
        if (tokenRef.current) {
          window.clearInterval(poll);
          resolve(tokenRef.current);
        } else if (Date.now() - startedAt > TOKEN_TIMEOUT_MS) {
          window.clearInterval(poll);
          // Give up and let the server reject it — never silently bypass.
          resolve(undefined);
        }
      }, 200);
    });
  }, [action, isConfigured, provider, siteKey]);

  const reset = useCallback(() => {
    tokenRef.current = null;
    if (provider === 'turnstile' && widgetIdRef.current) {
      window.turnstile?.reset(widgetIdRef.current);
    }
  }, [provider]);

  useImperativeHandle(ref, () => ({ getToken, reset }), [getToken, reset]);

  if (!isConfigured) return null;

  if (provider === 'recaptcha') {
    return (
      <>
        <Script
          src={`https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`}
          strategy="afterInteractive"
          onReady={() => setScriptReady(true)}
        />
        {/* reCAPTCHA v3 requires this attribution notice when the badge is hidden. */}
        <p className="text-xs leading-relaxed text-ink-faint">
          Сайт защищён reCAPTCHA. Применяются{' '}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Политика конфиденциальности
          </a>{' '}
          и{' '}
          <a
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Условия использования
          </a>{' '}
          Google.
        </p>
      </>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
    </>
  );
});
