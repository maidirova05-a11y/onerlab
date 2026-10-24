import Link from 'next/link';

import { LoginForm } from '@/components/admin/LoginForm';
import { Logo } from '@/components/layout/Logo';
import { adminEnabled } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * Only a path inside the panel is accepted as a redirect target.
 *
 * Without this check `?next=https://evil.com` would make the login screen an
 * open redirect — a classic phishing primitive, since the link genuinely starts
 * at the real domain. The previous check (`startsWith('/')` and not `//`) still
 * let `?next=/\evil.com` through: the WHATWG URL parser treats a backslash as a
 * slash for http(s), so `router.push('/\evil.com')` resolved to
 * `https://evil.com/`. The only values the proxy ever puts here are `/admin`
 * paths, so that is all that is accepted — a single leading slash, no
 * backslash anywhere, and URL-safe characters only.
 */
const SAFE_NEXT_PATTERN = /^\/admin(?:[/?#][\w\-.~!$&'()*+,;=:@/?%#]*)?$/;

function safeNext(value: string | undefined): string {
  if (!value || value.includes('\\') || !SAFE_NEXT_PATTERN.test(value)) return '/admin';
  return value;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-[1.75rem] border border-line bg-canvas p-8 shadow-[0_20px_60px_-30px_rgba(51,51,51,0.35)] sm:p-10">
        <Logo href="/" width={132} />

        <h1 className="mt-7 text-2xl font-extrabold text-ink">Панель заявок</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Введите пароль, чтобы посмотреть заявки на пробный урок.
        </p>

        {adminEnabled ? (
          <div className="mt-7">
            <LoginForm next={safeNext(next)} />
          </div>
        ) : (
          /*
            Shown when ADMIN_PASSWORD_HASH / ADMIN_SESSION_SECRET are missing.
            This is a setup screen for the owner, so it names the command — the
            page is unreachable in a correctly configured deployment.
          */
          <p className="mt-7 rounded-xl border border-line bg-canvas-alt px-4 py-4 text-sm leading-relaxed text-ink-soft">
            Панель ещё не настроена. Сгенерируйте пароль командой{' '}
            <code className="rounded bg-ink/10 px-1.5 py-0.5 font-mono text-[0.8em]">
              npm run admin:password -- &quot;ваш-пароль&quot;
            </code>{' '}
            и добавьте полученные переменные в окружение.
          </p>
        )}

        <p className="mt-8 text-center text-xs text-ink-faint">
          <Link href="/" className="font-semibold transition-colors hover:text-ink">
            ← Вернуться на сайт
          </Link>
        </p>
      </div>
    </div>
  );
}
