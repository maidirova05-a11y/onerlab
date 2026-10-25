import { Prisma, type Lead, type LeadStatus } from '@prisma/client';

import { prisma } from '@/lib/db';
import { AppError, ErrorCode } from '@/lib/http';
import { logger } from '@/lib/logger';
import { ensureLeadAttributionColumns } from '@/server/db/ensure-schema';
import type { LeadFormData } from '@/validation/lead.schema';

/**
 * =============================================================================
 * Lead business logic.
 * =============================================================================
 * Deliberately separated from the HTTP layer (SOLID / single responsibility):
 * the route handler knows about status codes, headers and rate limits; this
 * module knows about what a *lead* is. The consequence is that the same logic
 * can later be reached from an admin panel, a Telegram bot or a cron import
 * without duplicating a line of it.
 * =============================================================================
 */

/** A repeat submission from the same number inside this window is a duplicate. */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

/** Columns that predate the attribution migration — always safe to select. */
const BASE_LEAD_SELECT = {
  id: true,
  parentName: true,
  childNameAge: true,
  school: true,
  phone: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  ipHash: true,
  userAgent: true,
  source: true,
} satisfies Prisma.LeadSelect;

const ATTRIBUTION_SELECT = {
  utmSource: true,
  utmMedium: true,
  utmCampaign: true,
  utmContent: true,
  utmTerm: true,
  referrer: true,
  landingPath: true,
} satisfies Prisma.LeadSelect;

type AttributionField = keyof typeof ATTRIBUTION_SELECT;

/** A lead row for the admin list; attribution is absent if its columns are. */
export type LeadListItem = Omit<Lead, AttributionField> & Partial<Pick<Lead, AttributionField>>;

export interface CreateLeadInput {
  data: LeadFormData;
  /** Salted hash of the submitting IP — never the raw address. */
  ipHash: string | null;
  userAgent: string | null;
  /** Attribution, e.g. "landing-hero" or "landing-form". */
  source: string | null;
}

/** Only non-sensitive fields are returned to the browser. */
export interface CreateLeadResult {
  id: string;
  createdAt: string;
}

export class LeadService {
  /**
   * Persists a validated lead.
   *
   * Assumes its input has already passed `leadFormSchema` — sanitisation and
   * normalisation are the validation layer's job, not this one's.
   */
  async create(input: CreateLeadInput): Promise<CreateLeadResult> {
    const { data, ipHash, userAgent, source } = input;

    try {
      // Never throws. If the attribution columns could not be ensured (e.g. the
      // role lacks ALTER), the lead is saved without them: attribution is worth
      // less than the lead.
      const withAttribution = await ensureLeadAttributionColumns();

      /*
       * Duplicate check and insert in ONE transaction, serialised per phone.
       *
       * As two separate statements the guard had a race: a double-tap, or the
       * same payload replayed from two tabs, produced two requests that both
       * ran `findFirst` (nothing yet), then both inserted. The browser's
       * `status === 'submitting'` guard hides the common case but is not a
       * control — it does not exist for curl.
       *
       * `pg_advisory_xact_lock` on a hash of the phone makes the second
       * request wait until the first has committed, at which point its
       * `findFirst` sees the new row and it is turned away as a duplicate.
       * Transaction-scoped, so the lock is released at COMMIT/ROLLBACK and
       * works through PgBouncer in transaction mode. `hashtext` collisions only
       * mean two unrelated numbers briefly queue behind each other.
       *
       * Tagged `$executeRaw`, so `phone` travels as a bound parameter, not as
       * SQL text.
       */
      const lead = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${data.phone}))`;

        const existing = await tx.lead.findFirst({
          where: { phone: data.phone, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
          select: { id: true },
        });
        if (existing) {
          throw new AppError(ErrorCode.DUPLICATE_SUBMISSION, {
            meta: { existingLeadId: existing.id },
          });
        }

        return tx.lead.create({
          // Fields are listed explicitly rather than spread from `data`. A spread
          // would happily forward an attacker-supplied `status: 'won'` or an `id`
          // if the schema ever loosened — this is mass-assignment protection.
          data: {
            parentName: data.parentName,
            childNameAge: data.childNameAge,
            school: data.school,
            phone: data.phone,
            ipHash,
            userAgent,
            source,
            // Marketing attribution — already sanitised by the schema; `undefined`
            // leaves the column NULL.
            ...(withAttribution
              ? {
                  utmSource: data.utmSource,
                  utmMedium: data.utmMedium,
                  utmCampaign: data.utmCampaign,
                  utmContent: data.utmContent,
                  utmTerm: data.utmTerm,
                  referrer: data.referrer,
                  landingPath: data.landingPath,
                }
              : {}),
          },
          // Keeps RETURNING to pre-attribution columns, so the insert works
          // whether or not the attribution migration has been applied.
          select: { id: true, createdAt: true },
        });
      });

      // Note: no personal data in the log line — `phone`/`parentName` are also
      // redacted by the logger config as a second layer of protection. The
      // utm_source/medium pair is not personal data and is what marketing asks
      // for first.
      logger.info(
        { leadId: lead.id, source, utmSource: data.utmSource, utmMedium: data.utmMedium },
        'Lead created',
      );

      return { id: lead.id, createdAt: lead.createdAt.toISOString() };
    } catch (error) {
      // The duplicate guard above throws from inside the transaction callback;
      // Prisma rolls back and rethrows it unchanged.
      if (error instanceof AppError) throw error;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 = unique constraint. Not currently reachable (phone is indexed,
        // not unique) but handled so that adding the constraint later cannot
        // turn a duplicate into an unhandled 500.
        if (error.code === 'P2002') {
          throw new AppError(ErrorCode.DUPLICATE_SUBMISSION, { cause: error });
        }
      }
      // Anything else bubbles up as a generic 500. The technical cause is
      // attached for the server log and stripped before the response.
      throw new AppError(ErrorCode.INTERNAL_ERROR, { cause: error });
    }
  }

  /** Used by a future admin view. Kept here so all lead reads share one path. */
  async listRecent(limit = 50): Promise<Lead[]> {
    return prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
    });
  }

  /**
   * Paginated, filtered list for the admin panel.
   *
   * `search` is passed to Prisma as a bound parameter, so the wildcard-looking
   * `contains` is a plain LIKE argument and not an injection surface.
   * `pageSize` is clamped because it arrives from a query string — an
   * unbounded value is a trivial way to make the server fetch the whole table.
   */
  async list(options: ListLeadsOptions = {}): Promise<ListLeadsResult> {
    const page = Math.max(1, Math.floor(options.page ?? 1));
    const pageSize = Math.min(Math.max(Math.floor(options.pageSize ?? 25), 1), 100);
    const search = options.search?.trim() ?? '';

    // Digits only, so "+7 700" and "7700" both match a stored E.164 number.
    // Only add the clause when something is left: a text query like "Гимназия"
    // reduces to '', and `contains: ''` matches EVERY row — which silently
    // turned the whole OR into "select everything".
    const phoneQuery = search.replace(/[^\d+]/g, '');

    const where: Prisma.LeadWhereInput = {
      ...(options.status ? { status: options.status } : {}),
      ...(search
        ? {
            OR: [
              { parentName: { contains: search, mode: 'insensitive' } },
              { childNameAge: { contains: search, mode: 'insensitive' } },
              { school: { contains: search, mode: 'insensitive' } },
              ...(phoneQuery.length > 0
                ? [{ phone: { contains: phoneQuery } } as Prisma.LeadWhereInput]
                : []),
            ],
          }
        : {}),
    };

    const withAttribution = await ensureLeadAttributionColumns();

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: withAttribution ? { ...BASE_LEAD_SELECT, ...ATTRIBUTION_SELECT } : BASE_LEAD_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /** Lead counts per status, for the dashboard tiles. */
  async countsByStatus(): Promise<Record<LeadStatus, number> & { total: number }> {
    const rows = await prisma.lead.groupBy({ by: ['status'], _count: { _all: true } });

    const counts = { new: 0, contacted: 0, scheduled: 0, won: 0, lost: 0, spam: 0, total: 0 };
    for (const row of rows) {
      counts[row.status] = row._count._all;
      counts.total += row._count._all;
    }
    return counts;
  }

  /**
   * Moves a lead along the pipeline.
   *
   * `status` is typed to the Prisma enum, and the route validates the incoming
   * string against it before calling — the database would reject anything else
   * anyway, but failing at the edge gives the manager a usable error instead of
   * a 500.
   */
  async updateStatus(id: string, status: LeadStatus): Promise<Pick<Lead, 'id' | 'status'> | null> {
    try {
      // Narrow RETURNING: independent of whether the attribution migration ran.
      const lead = await prisma.lead.update({
        where: { id },
        data: { status },
        select: { id: true, status: true },
      });
      logger.info({ leadId: id, status }, 'lead status updated');
      return lead;
    } catch (error) {
      // P2025 = "record not found", the one failure that is not exceptional here.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null;
      }
      throw error;
    }
  }
}

export interface ListLeadsOptions {
  status?: LeadStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListLeadsResult {
  items: LeadListItem[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const leadService = new LeadService();
