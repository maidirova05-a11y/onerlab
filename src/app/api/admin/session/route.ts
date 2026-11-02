import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { verifyPassword } from '@/lib/admin-password';
import { ADMIN_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/admin-session';
import { adminEnabled, env, isProduction } from '@/lib/env';
import { AppError, ErrorCode, jsonError, jsonSuccess, newRequestId } from '@/lib/http';
import { logger } from '@/lib/logger';
import { createRateLimiter, rateLimitHeaders } from '@/lib/rate-limit';
import { getRateLimitKey, isOriginAllowed } from '@/lib/request-context';

/**
 * =============================================================================
 * POST /api/admin/session  — log in
 * DELETE /api/admin/session — log out
 * =============================================================================
 * Kept off the Edge runtime: scrypt verification needs Node's crypto.
 * =============================================================================
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Far tighter than the public form's limiter (5/min). A login endpoint with one
 * known username is the one place where an attacker gets unlimited guesses for
 * free, so 5 attempts per 15 minutes per IP is the actual control that makes a
 * 12-character password sufficient.
 */
const loginLimiter = createRateLimiter('admin-login', { max: 5, windowMs: 15 * 60 * 1000 });

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();

  // 503, not 404: the route exists, it is the configuration that is missing.
  if (!adminEnabled) return jsonError(new AppError(ErrorCode.NOT_CONFIGURED), requestId);

  // Same CSRF control the public form uses: a browser cannot forge `Origin`.
  if (!isOriginAllowed(request)) {
    return jsonError(new AppError(ErrorCode.FORBIDDEN_ORIGIN), requestId);
  }

  const ip = getRateLimitKey(request);
  const limit = await loginLimiter.limit(ip);

  if (!limit.success) {
    logger.warn({ ip }, 'admin login rate-limited');
    return jsonError(new AppError(ErrorCode.LOGIN_RATE_LIMITED), requestId, {
      headers: rateLimitHeaders(limit),
    });
  }

  // One message for every failure mode, so the response never says why.
  const invalid = () => jsonError(new AppError(ErrorCode.INVALID_CREDENTIALS), requestId);

  let password: string;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return invalid();
    password = parsed.data.password;
  } catch {
    return invalid();
  }

  const ok = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);

  if (!ok) {
    // Logged with the IP but never the attempted password.
    logger.warn({ ip, remaining: limit.remaining }, 'admin login failed');
    return invalid();
  }

  const token = await createSessionToken();
  const response = jsonSuccess({ authenticated: true }, requestId);
  response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(isProduction));
  logger.info({ ip }, 'admin login succeeded');
  return response;
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const requestId = newRequestId();

  // Logout CSRF is low impact but costs one line to close.
  if (!isOriginAllowed(request)) {
    return jsonError(new AppError(ErrorCode.FORBIDDEN_ORIGIN), requestId);
  }

  const response = jsonSuccess({ authenticated: false }, requestId);
  // maxAge 0 expires it immediately. The other attributes must still match the
  // ones used at set time or the browser keeps the original cookie.
  response.cookies.set(ADMIN_COOKIE, '', { ...sessionCookieOptions(isProduction), maxAge: 0 });
  return response;
}
