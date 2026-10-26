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
 * database, and it exclusively emits parameterised queries. The only
 * `*RawUnsafe` calls (src/server/db/ensure-schema.ts) run constant DDL with no
 * interpolated input — that is what makes SQL injection structurally
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

/*
 * Cached on globalThis in production too, not only for dev hot-reload.
 *
 * Next.js bundles the route handlers and the pages into separate module
 * graphs, so a plain module-level singleton is instantiated once PER GRAPH.
 * Measured under load on one `next start` process: 18 open connections — two
 * pools of 9 (Prisma's default of cpus*2+1) for what should be one. On
 * serverless that doubles each instance's share of the database's connection
 * budget. See README, "Database connections on Vercel", for the pool settings.
 */
globalForPrisma.prisma = prisma;
