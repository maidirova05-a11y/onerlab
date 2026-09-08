import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { verifyPassword } from '@/lib/admin-password';
import { ADMIN_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/admin-session';
import { adminEnabled, env, isProduction } from '@/lib/env';
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

/** One message for every failure mode — see the note in POST. */
const GENERIC_FAILURE = 'Неверный пароль.';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!adminEnabled) {
    // 503, not 404: the route exists, it is the configuration that is missing.
    // The message names no variable, so it tells an attacker nothing.
    return NextResponse.json(
      { success: false, error: 'Админ-панель не настроена.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Same CSRF control the public form uses: a browser cannot forge `Origin`,
  // so an allow-list on it stops a login form hosted on another domain from
  // driving this endpoint.
  if (!isOriginAllowed(request)) {
    return NextResponse.json(
      { success: false, error: 'Запрос отклонён.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const ip = getRateLimitKey(request);
  const limit = await loginLimiter.limit(ip);

  if (!limit.success) {
    logger.warn({ ip }, 'admin login rate-limited');
    return NextResponse.json(
      { success: false, error: 'Слишком много попыток входа. Попробуйте позже.' },
      { status: 429, headers: { 'Cache-Control': 'no-store', ...rateLimitHeaders(limit) } },
    );
  }

  let password: string;
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: GENERIC_FAILURE },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    password = parsed.data.password;
  } catch {
    return NextResponse.json(
      { success: false, error: GENERIC_FAILURE },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const ok = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);

  if (!ok) {
    // Logged with the IP but never the attempted password.
    logger.warn({ ip, remaining: limit.remaining }, 'admin login failed');
    return NextResponse.json(
      { success: false, error: GENERIC_FAILURE },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const token = await createSessionToken();
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(isProduction));
  logger.info({ ip }, 'admin login succeeded');
  return response;
}

export async function DELETE(): Promise<NextResponse> {
  const response = NextResponse.json(
    { success: true },
    { status: 200, headers: { 'Cache-Control': 'no-store' } },
  );

  // maxAge 0 expires it immediately. The other attributes must still match the
  // ones used at set time or the browser keeps the original cookie.
  response.cookies.set(ADMIN_COOKIE, '', { ...sessionCookieOptions(isProduction), maxAge: 0 });
  return response;
}
