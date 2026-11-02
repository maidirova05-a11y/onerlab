import { prisma } from '@/lib/db';
import { jsonSuccess, newRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';

/**
 * GET /api/health — liveness plus a database ping, for load balancers and
 * uptime monitors. Reveals nothing but "ok"/"degraded"; failures are logged,
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
    return jsonSuccess({ status: 'degraded' as const }, requestId, { status: 503 });
  }
}
