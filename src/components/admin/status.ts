/**
 * Single source of truth for how a lead status is labelled and coloured.
 *
 * Shared by the server-rendered table, the client-side select and the summary
 * tiles, so a new pipeline stage is added in exactly one place. The keys mirror
 * the Prisma `LeadStatus` enum.
 */
export const LEAD_STATUSES = {
  new: { label: 'Новая', className: 'border-brand bg-brand/20 text-ink' },
  contacted: { label: 'Созвонились', className: 'border-blue-200 bg-blue-50 text-blue-800' },
  scheduled: { label: 'Записан', className: 'border-violet-200 bg-violet-50 text-violet-800' },
  won: { label: 'Учится', className: 'border-green-200 bg-green-50 text-green-800' },
  lost: { label: 'Отказ', className: 'border-line bg-canvas-alt text-ink-muted' },
  spam: { label: 'Спам', className: 'border-red-200 bg-red-50 text-red-700' },
} as const;

export type LeadStatusValue = keyof typeof LEAD_STATUSES;

/** Order used for the filter tabs and the summary tiles. */
export const STATUS_ORDER: LeadStatusValue[] = [
  'new',
  'contacted',
  'scheduled',
  'won',
  'lost',
  'spam',
];
