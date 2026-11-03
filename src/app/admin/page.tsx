import Link from 'next/link';

import { LogoutButton } from '@/components/admin/LogoutButton';
import { StatusSelect } from '@/components/admin/StatusSelect';
import { leadSource } from '@/components/admin/source';
import { LEAD_STATUSES, STATUS_ORDER, type LeadStatusValue } from '@/components/admin/status';
import { Logo } from '@/components/layout/Logo';
import { leadService } from '@/server/services/lead.service';

/**
 * =============================================================================
 * /admin — trial-lesson requests.
 * =============================================================================
 * A Server Component: the leads are read directly through the service layer, so
 * no lead data is ever serialised into a public API the browser could be
 * tricked into calling. Only the status change needs a client round-trip.
 *
 * Access is enforced in `middleware.ts`; by the time this renders the session
 * has already been verified.
 * =============================================================================
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

function isStatus(value: string | undefined): value is LeadStatusValue {
  return value !== undefined && value in LEAD_STATUSES;
}

/** dd.MM.yyyy HH:mm in Astana time, which is what the manager actually works in. */
const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Almaty',
});

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const params = await searchParams;

  const status = isStatus(params.status) ? params.status : undefined;
  const search = params.q?.slice(0, 100) ?? '';
  const page = Math.max(1, Number(params.page) || 1);

  const [{ items, total, pageCount }, counts] = await Promise.all([
    leadService.list({ status, search, page, pageSize: PAGE_SIZE }),
    leadService.countsByStatus(),
  ]);

  /** Preserves the current filter/search when building a link. */
  const linkTo = (next: { status?: string; q?: string; page?: number }) => {
    const query = new URLSearchParams();
    const nextStatus = next.status ?? status;
    const nextQuery = next.q ?? search;
    if (nextStatus) query.set('status', nextStatus);
    if (nextQuery) query.set('q', nextQuery);
    if (next.page && next.page > 1) query.set('page', String(next.page));
    const qs = query.toString();
    return qs ? `/admin?${qs}` : '/admin';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Logo href="/" width={120} />
          <div>
            <h1 className="text-xl font-semibold text-ink sm:text-2xl">Заявки</h1>
            <p className="text-sm text-ink-muted">Всего в базе: {counts.total}</p>
          </div>
        </div>
        <LogoutButton />
      </header>

      {/* --- Summary tiles: double as status filters --- */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <FilterTile href={linkTo({ status: '', page: 1 })} active={!status} label="Все" value={counts.total} />
        {STATUS_ORDER.map((value) => (
          <FilterTile
            key={value}
            href={linkTo({ status: value, page: 1 })}
            active={status === value}
            label={LEAD_STATUSES[value].label}
            value={counts[value]}
          />
        ))}
      </div>

      {/* --- Search: a plain GET form, so it works without JavaScript --- */}
      <form method="GET" action="/admin" className="mt-6 flex flex-wrap gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Поиск по имени или телефону"
          aria-label="Поиск по заявкам"
          className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-4 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
        />
        <button
          type="submit"
          className="rounded-pill bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          Найти
        </button>
        {search && (
          <Link
            href={linkTo({ q: '', page: 1 })}
            className="rounded-pill border border-line px-5 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-alt"
          >
            Сбросить
          </Link>
        )}
      </form>

      {/* --- Table --- */}
      <div className="mt-6 overflow-x-auto rounded-2xl border border-line bg-canvas">
        <table className="w-full min-w-[1120px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-canvas-alt text-sm text-ink-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Дата</th>
              <th scope="col" className="px-4 py-3 font-semibold">Родитель</th>
              <th scope="col" className="px-4 py-3 font-semibold">Ребёнок и возраст</th>
              <th scope="col" className="px-4 py-3 font-semibold">Школа</th>
              <th scope="col" className="px-4 py-3 font-semibold">Телефон</th>
              <th scope="col" className="px-4 py-3 font-semibold">Источник</th>
              <th scope="col" className="px-4 py-3 font-semibold">Статус</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-sm text-ink-muted">
                  {search || status
                    ? 'По этому фильтру заявок нет.'
                    : 'Заявок пока нет. Они появятся здесь сразу после отправки формы на сайте.'}
                </td>
              </tr>
            ) : (
              items.map((lead) => {
                const source = leadSource(lead);
                return (
                  <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-canvas-alt/60">
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap text-ink-muted">
                      {dateFormatter.format(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-ink">{lead.parentName}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-soft">{lead.childNameAge}</td>
                    <td className="px-4 py-3.5 text-sm text-ink-soft">
                      {lead.school ?? <span className="text-ink-faint">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-sm whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <a href={`tel:${lead.phone}`} className="font-semibold text-ink hover:underline">
                          {lead.phone}
                        </a>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-green-700 hover:underline"
                        >
                          WhatsApp
                        </a>
                      </div>
                    </td>
                    {/*
                      Where the lead came from. utm_source / utm_medium when the
                      ad was tagged, else the referrer host, else "прямой заход".
                      The full UTM set, referrer and landing path sit in the
                      tooltip — the manager needs the channel at a glance, the
                      marketer needs the rest occasionally.
                    */}
                    <td className="px-4 py-3.5 text-sm">
                      <span
                        title={source.details.length ? source.details.join('\n') : undefined}
                        className={`inline-block max-w-[180px] truncate align-middle ${
                          source.details.length ? 'text-ink-soft' : 'text-ink-faint'
                        }`}
                      >
                        {source.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusSelect leadId={lead.id} initialStatus={lead.status} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- Pagination --- */}
      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Страницы">
          <PageLink href={linkTo({ page: page - 1 })} disabled={page <= 1}>
            ← Назад
          </PageLink>
          <span className="text-sm text-ink-muted">
            Страница {page} из {pageCount} · {total} заявок
          </span>
          <PageLink href={linkTo({ page: page + 1 })} disabled={page >= pageCount}>
            Вперёд →
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function FilterTile({
  href,
  active,
  label,
  value,
}: {
  href: string;
  active: boolean;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`rounded-2xl border px-4 py-3 transition-colors ${
        active ? 'border-ink bg-ink text-white' : 'border-line bg-canvas hover:border-ink/30'
      }`}
    >
      <span className={`block text-xs font-semibold ${active ? 'text-white/70' : 'text-ink-muted'}`}>
        {label}
      </span>
      <span className="mt-0.5 block text-2xl font-semibold">{value}</span>
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  href: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span aria-disabled className="rounded-pill border border-line px-4 py-2 text-sm text-ink-faint">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="rounded-pill border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-canvas-alt"
    >
      {children}
    </Link>
  );
}
