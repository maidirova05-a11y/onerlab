'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { LEAD_STATUSES, type LeadStatusValue } from '@/components/admin/status';

/**
 * Inline status control for one lead.
 *
 * Optimistic: the select shows the new value immediately and rolls back if the
 * request fails. A manager works down the list quickly, and waiting on a
 * round-trip per row makes that feel broken.
 */
export function StatusSelect({
  leadId,
  initialStatus,
}: {
  leadId: string;
  initialStatus: LeadStatusValue;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<LeadStatusValue>(initialStatus);
  const [failed, setFailed] = useState(false);
  const [isPending, startTransition] = useTransition();

  async function handleChange(next: LeadStatusValue) {
    const previous = status;
    setStatus(next);
    setFailed(false);

    try {
      const response = await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (response.status === 401) {
        // Session expired: the proxy answers with the UNAUTHORIZED envelope.
        router.push('/admin/login?next=/admin');
        return;
      }

      if (!response.ok) {
        setStatus(previous);
        setFailed(true);
        return;
      }

      // Re-render the server component so the counters at the top stay honest.
      startTransition(() => router.refresh());
    } catch {
      setStatus(previous);
      setFailed(true);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Статус заявки"
        value={status}
        disabled={isPending}
        onChange={(event) => void handleChange(event.target.value as LeadStatusValue)}
        className={`rounded-lg border px-2.5 py-1.5 text-sm font-semibold outline-none transition-colors focus:ring-2 focus:ring-brand/40 ${LEAD_STATUSES[status].className}`}
      >
        {(Object.keys(LEAD_STATUSES) as LeadStatusValue[]).map((value) => (
          <option key={value} value={value}>
            {LEAD_STATUSES[value].label}
          </option>
        ))}
      </select>

      {failed && (
        <span role="alert" className="text-xs font-semibold text-red-600">
          Не сохранилось
        </span>
      )}
    </div>
  );
}
