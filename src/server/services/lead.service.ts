import { Prisma, type Lead, type LeadStatus } from '@prisma/client';

import { prisma } from '@/lib/db';
import { AppError, ErrorCode } from '@/lib/http';
import { logger } from '@/lib/logger';
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

    await this.assertNotDuplicate(data.phone);

    try {
      const lead = await prisma.lead.create({
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
        },
        select: { id: true, createdAt: true },
      });

      // Note: no personal data in the log line — `phone`/`parentName` are also
      // redacted by the logger config as a second layer of protection.
      logger.info({ leadId: lead.id, source }, 'Lead created');

      return { id: lead.id, createdAt: lead.createdAt.toISOString() };
    } catch (error) {
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

  /**
   * Guards against a parent double-tapping the submit button (or a bot
   * replaying the same payload) creating duplicate cards for the sales team.
   */
  private async assertNotDuplicate(phone: string): Promise<void> {
    const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);

    const existing = await prisma.lead.findFirst({
      where: { phone, createdAt: { gte: since } },
      select: { id: true },
    });

    if (existing) {
      throw new AppError(ErrorCode.DUPLICATE_SUBMISSION, { meta: { existingLeadId: existing.id } });
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

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
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
  async updateStatus(id: string, status: LeadStatus): Promise<Lead | null> {
    try {
      const lead = await prisma.lead.update({ where: { id }, data: { status } });
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
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export const leadService = new LeadService();
