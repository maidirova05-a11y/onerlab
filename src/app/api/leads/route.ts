import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { verifyCaptcha } from '@/lib/captcha';
import { AppError, ErrorCode, jsonError, jsonSuccess, newRequestId, toAppError } from '@/lib/http';
import { requestLogger } from '@/lib/logger';
import { createRateLimiter, rateLimitHeaders } from '@/lib/rate-limit';
import {
  corsHeaders,
  getClientIp,
  getRateLimitKey,
  getUserAgent,
  hashIp,
  isOriginAllowed,
} from '@/lib/request-context';
import { leadService } from '@/server/services/lead.service';
import { leadFormSchema, toFieldErrors } from '@/validation/lead.schema';

/**
 * =============================================================================
 * POST /api/leads — public trial-lesson request endpoint.
 * =============================================================================
 * This is the only write path exposed to the internet, so it carries the full
 * defence stack. Order matters: each check is arranged cheapest-first, so an
 * abusive request is rejected before it can cost us a database round-trip or an
 * outbound CAPTCHA verification.
 *
 *   1. Origin allow-list        — CSRF / cross-site abuse         (403)
 *   2. Content-Type check       — blocks simple-request CSRF      (415)
 *   3. Body size cap            — memory exhaustion               (413)
 *   4. Rate limit per IP        — spam / application-layer DoS    (429)
 *   5. Honeypot                 — naive bots, silently absorbed   (200 decoy)
 *   6. Zod validation           — shape, length, charset          (400)
 *   7. CAPTCHA verification     — scripted bots                   (403)
 *   8. Duplicate guard          — double submits                  (409)
 *   9. Persist via Prisma       — parameterised, no raw SQL
 *
 * Everything is wrapped in a global try/catch so that no exception can crash
 * the process or leak a stack trace to the browser.
 * =============================================================================
 */

// Node runtime: the service layer uses Prisma and node:crypto.
export const runtime = 'nodejs';
// Never prerender or cache a mutation endpoint.
export const dynamic = 'force-dynamic';

/**
 * Reject anything larger than this before parsing.
 *
 * Budget: four form fields (~350 bytes), a CAPTCHA token (Turnstile issues up
 * to 2 KB), and the attribution block — five UTM values at 120 characters, a
 * 500-character referrer and a 255-character landing path, which as Cyrillic
 * JSON-escaped text can approach 2 KB. 8 KB leaves headroom for all of that
 * together while still refusing anything that looks like a payload.
 */
const MAX_BODY_BYTES = 8192;

const leadRateLimiter = createRateLimiter('leads');

export async function POST(request: Request): Promise<NextResponse> {
  const requestId = newRequestId();
  const log = requestLogger(requestId, 'POST /api/leads');
  const cors = corsHeaders(request);

  try {
    // --- 1. Origin allow-list ------------------------------------------------
    // Browsers cannot forge `Origin`, so this blocks a form hosted on another
    // domain from posting into our CRM.
    if (!isOriginAllowed(request)) {
      log.warn({ origin: request.headers.get('origin') }, 'Blocked request from disallowed origin');
      throw new AppError(ErrorCode.FORBIDDEN_ORIGIN);
    }

    // --- 2. Content-Type -----------------------------------------------------
    // Requiring application/json means the request can no longer be a CORS
    // "simple request", so the browser must preflight it — closing off the
    // classic form-POST CSRF vector entirely.
    const contentType = request.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new AppError(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
    }

    // --- 3. Body size --------------------------------------------------------
    const declaredLength = Number(request.headers.get('content-length') ?? '0');
    if (declaredLength > MAX_BODY_BYTES) {
      throw new AppError(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    const rawBody = await request.text();
    // `Content-Length` is a claim, not a fact — re-check the actual byte length.
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      throw new AppError(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    // --- 4. Rate limit -------------------------------------------------------
    const rateLimitResult = await leadRateLimiter.limit(getRateLimitKey(request));
    const limitHeaders = rateLimitHeaders(rateLimitResult);

    if (!rateLimitResult.success) {
      log.warn({ retryAfter: rateLimitResult.retryAfterSeconds }, 'Rate limit exceeded');
      return jsonError(new AppError(ErrorCode.RATE_LIMITED), requestId, {
        headers: { ...cors, ...limitHeaders },
      });
    }

    // --- Parse JSON ----------------------------------------------------------
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new AppError(ErrorCode.VALIDATION_ERROR);
    }

    // --- 5. Honeypot ---------------------------------------------------------
    // Answered with a *fake success*. Telling a bot why it failed just teaches
    // whoever wrote it how to get past the trap next time.
    const honeypot = (payload as { website?: unknown })?.website;
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      log.warn('Honeypot triggered — silently discarding submission');
      return jsonSuccess({ id: 'accepted', createdAt: new Date().toISOString() }, requestId, {
        status: 201,
        headers: { ...cors, ...limitHeaders },
      });
    }

    // --- 6. Validation (identical schema as the client) ----------------------
    const parsed = leadFormSchema.safeParse(payload);
    if (!parsed.success) {
      log.info({ fields: Object.keys(toFieldErrors(parsed.error)) }, 'Validation failed');
      throw new AppError(ErrorCode.VALIDATION_ERROR, { fields: toFieldErrors(parsed.error) });
    }

    // --- 7. CAPTCHA ----------------------------------------------------------
    const clientIp = getClientIp(request);
    const captcha = await verifyCaptcha(parsed.data.captchaToken, clientIp);
    if (!captcha.success) {
      log.warn({ errors: captcha.errors, score: captcha.score }, 'CAPTCHA verification failed');
      throw new AppError(ErrorCode.CAPTCHA_FAILED, { meta: { errors: captcha.errors } });
    }

    // --- 8 & 9. Duplicate guard + persist ------------------------------------
    const lead = await leadService.create({
      data: parsed.data,
      ipHash: hashIp(clientIp),
      userAgent: getUserAgent(request),
      source: 'landing-form',
    });

    log.info({ leadId: lead.id }, 'Lead accepted');

    return jsonSuccess(lead, requestId, {
      status: 201,
      headers: { ...cors, ...limitHeaders },
    });
  } catch (error) {
    return handleRouteError(error, requestId, cors, log);
  }
}

/**
 * CORS preflight. The browser sends this before the real POST because we
 * require `Content-Type: application/json`. Answering it correctly — and only
 * for allow-listed origins — is what keeps the endpoint reachable from our own
 * site and nowhere else.
 */
export async function OPTIONS(request: Request): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

/**
 * Any other verb is refused explicitly, with `Allow` set, instead of falling
 * through to a framework default.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Метод не поддерживается.' } },
    { status: 405, headers: { Allow: 'POST, OPTIONS' } },
  );
}

/**
 * -----------------------------------------------------------------------------
 * Global error handler.
 * -----------------------------------------------------------------------------
 * Single funnel for every failure in this route. It logs the full technical
 * detail server-side and returns only a curated, translated message — the
 * frontend never sees a stack trace, a Prisma error code or a table name.
 */
function handleRouteError(
  error: unknown,
  requestId: string,
  cors: Record<string, string>,
  log: ReturnType<typeof requestLogger>,
): NextResponse {
  const appError = toAppError(error);

  if (appError.status >= 500) {
    // Unexpected — log at error level with the original cause attached.
    log.error(
      { err: appError.cause ?? error, code: appError.code },
      'Unhandled error while processing lead',
    );
  } else if (error instanceof ZodError) {
    log.info({ code: appError.code }, 'Request rejected by validation');
  } else {
    log.info({ code: appError.code, meta: appError.meta }, 'Request rejected');
  }

  return jsonError(appError, requestId, { headers: cors });
}
