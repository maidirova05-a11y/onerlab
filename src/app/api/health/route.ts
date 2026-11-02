import { prisma } from '@/lib/db';
import { AppError, ErrorCode, jsonError, jsonSuccess, newRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';

/**
 * GET /api/health — liveness plus a database ping, for load balancers and
 * uptime monitors. Reveals nothing but "ok" or a generic 503 envelope; failures are logged,
 * never echoed.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const requestId = newRequestId();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return jsonSuccess({ status: 'ok' as const }, requestId);
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, 'health check: db down');
    // A real failure envelope: `success: true` on a 503 would contradict itself.
    return jsonError(new AppError(ErrorCode.SERVICE_UNAVAILABLE), requestId);
  }
}
