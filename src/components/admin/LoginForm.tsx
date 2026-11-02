'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

/**
 * Admin login.
 *
 * The password is posted to `/api/admin/session`, which sets an HttpOnly
 * cookie. It is never stored in component state beyond the keystroke, never put
 * in localStorage, and never appended to a URL — a query string would land in
 * server logs and browser history.
 */
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;

      if (!response.ok) {
        setError(payload?.error?.message ?? 'Не удалось войти. Попробуйте ещё раз.');
        setPassword('');
        return;
      }

      // `refresh()` re-runs middleware so the new cookie is picked up before the
      // push lands; without it the redirect can bounce straight back to /login.
      router.refresh();
      router.push(next);
    } catch {
      setError('Нет связи с сервером. Проверьте подключение.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm" noValidate>
      <label htmlFor="admin-password" className="block text-sm font-semibold text-ink">
        Пароль
      </label>

      <input
        id="admin-password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        autoFocus
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'admin-password-error' : undefined}
        className="mt-2 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-base text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/40"
      />

      {error && (
        <p
          id="admin-password-error"
          role="alert"
          className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || password.length === 0}
        className="mt-5 inline-flex w-full items-center justify-center rounded-pill bg-brand px-6 py-3.5 text-base font-bold text-ink transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? 'Проверяем…' : 'Войти'}
      </button>
    </form>
  );
}
