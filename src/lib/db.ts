import { PrismaClient } from '@prisma/client';

import { env, isProduction } from '@/lib/env';

/**
 * =============================================================================
 * Prisma client singleton.
 * =============================================================================
 * Next.js hot-reloads modules in development. Without this guard every reload
 * would open a brand-new pool and the database would run out of connections
 * after a few dozen edits.
 *
 * Security note: Prisma is the *only* thing in this codebase that talks to the
 * database, and it exclusively emits parameterised queries. There is no raw
 * `$queryRawUnsafe` anywhere — that is what makes SQL injection structurally
 * impossible rather than merely "handled".
 * =============================================================================
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logs contain user data, so they are development-only.
    log: isProduction ? ['warn', 'error'] : ['query', 'warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}
