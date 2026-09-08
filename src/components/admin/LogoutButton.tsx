'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

/**
 * Logout is a DELETE rather than a link, so it cannot be triggered by an <img>
 * or a prefetch. The cookie is HttpOnly, so only the server can clear it.
 */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    if (pending) return;
    setPending(true);

    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
    } catch {
      // Even if the request fails, send the user to the login screen — the
      // server rejects the stale cookie on the next request anyway.
    } finally {
      router.refresh();
      router.push('/admin/login');
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={pending}
      className="rounded-pill border border-line px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-alt hover:text-ink disabled:opacity-50"
    >
      {pending ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
