import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session';
import { adminEnabled } from '@/lib/env';
import { logger } from '@/lib/logger';
import { isOriginAllowed } from '@/lib/request-context';
import { leadService } from '@/server/services/lead.service';

/**
 * =============================================================================
 * PATCH /api/admin/leads/:id — move a lead along the pipeline.
 * =============================================================================
 * `middleware.ts` already gates every /api/admin/* path, but the session is
 * verified again here. Defence in depth: a future matcher edit, a rewrite, or a
 * direct invocation must not be able to reach the database unauthenticated.
 * =============================================================================
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Mirrors the Prisma `LeadStatus` enum. */
const patchSchema = z.object({
  status: z.enum(['new', 'contacted', 'scheduled', 'won', 'lost', 'spam']),
});

const noStore = { 'Cache-Control': 'no-store' } as const;

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  if (!adminEnabled) {
    return NextResponse.json(
      { success: false, error: 'Админ-панель не настроена.' },
      { status: 503, headers: noStore },
    );
  }

  const session = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Требуется вход.' },
      { status: 401, headers: noStore },
    );
  }

  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { success: false, error: 'Запрос отклонён.' },
      { status: 403, headers: noStore },
    );
  }

  const { id } = await context.params;

  // cuid()s are the only ids this table issues; rejecting anything else keeps
  // junk out of the query path.
  if (!/^[a-z0-9]{20,32}$/i.test(id)) {
    return NextResponse.json(
      { success: false, error: 'Заявка не найдена.' },
      { status: 404, headers: noStore },
    );
  }

  let status: z.infer<typeof patchSchema>['status'];
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Недопустимый статус.' },
        { status: 400, headers: noStore },
      );
    }
    status = parsed.data.status;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Недопустимый статус.' },
      { status: 400, headers: noStore },
    );
  }

  try {
    const lead = await leadService.updateStatus(id, status);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: 'Заявка не найдена.' },
        { status: 404, headers: noStore },
      );
    }

    return NextResponse.json(
      { success: true, data: { id: lead.id, status: lead.status } },
      { status: 200, headers: noStore },
    );
  } catch (error) {
    // The technical detail is logged; the client gets a fixed message.
    logger.error({ err: error, leadId: id }, 'admin failed to update lead status');
    return NextResponse.json(
      { success: false, error: 'Не удалось сохранить статус.' },
      { status: 500, headers: noStore },
    );
  }
}
