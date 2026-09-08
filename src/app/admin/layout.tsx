import type { Metadata } from 'next';

/**
 * Admin shell.
 *
 * `noindex, nofollow` matters even though the panel is behind a password:
 * without it the login page can be indexed, which advertises to anyone that an
 * admin surface exists at this domain. `robots.ts` disallows /admin as well —
 * belt and braces, since a crawler that ignores robots.txt still honours this.
 */
export const metadata: Metadata = {
  // Bare title, no " | OnerLab" suffix — the root layout defines a title
  // template that appends it, and spelling it out here produced
  // "Панель заявок | OnerLab | OnerLab".
  title: 'Панель заявок',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative z-10 min-h-dvh bg-canvas-alt">{children}</div>;
}
