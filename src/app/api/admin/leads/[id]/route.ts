import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-session';
import { adminEnabled } from '@/lib/env';
import { AppError, ErrorCode, jsonError, jsonSuccess, newRequestId } from '@/lib/http';
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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const requestId = newRequestId();

  if (!adminEnabled) return jsonError(new AppError(ErrorCode.NOT_CONFIGURED), requestId);

  const session = await verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!session) return jsonError(new AppError(ErrorCode.UNAUTHORIZED), requestId);

  if (!isOriginAllowed(request)) {
    return jsonError(new AppError(ErrorCode.FORBIDDEN_ORIGIN), requestId);
  }

  const { id } = await context.params;

  // cuid()s are the only ids this table issues; rejecting anything else keeps
  // junk out of the query path.
  if (!/^[a-z0-9]{20,32}$/i.test(id)) {
    return jsonError(new AppError(ErrorCode.NOT_FOUND), requestId);
  }

  let status: z.infer<typeof patchSchema>['status'];
  try {
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(new AppError(ErrorCode.VALIDATION_ERROR), requestId);
    }
    status = parsed.data.status;
  } catch {
    return jsonError(new AppError(ErrorCode.VALIDATION_ERROR), requestId);
  }

  try {
    const lead = await leadService.updateStatus(id, status);
    if (!lead) return jsonError(new AppError(ErrorCode.NOT_FOUND), requestId);
    return jsonSuccess({ id: lead.id, status: lead.status }, requestId);
  } catch (error) {
    // The technical detail is logged; the client gets a fixed message.
    logger.error({ err: error, leadId: id }, 'admin failed to update lead status');
    return jsonError(new AppError(ErrorCode.INTERNAL_ERROR, { cause: error }), requestId);
  }
}
