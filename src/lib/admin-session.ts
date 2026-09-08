import { env } from '@/lib/env';

/**
 * =============================================================================
 * Admin session tokens — sign and verify.
 * =============================================================================
 * EDGE-SAFE BY DESIGN. This module uses only Web Crypto (`crypto.subtle`), with
 * no `node:` imports, because `middleware.ts` runs on the Edge runtime and has
 * to verify the session on every /admin request. Password *hashing* needs
 * scrypt, which is Node-only — that lives in `admin-password.ts` and is
 * imported exclusively by the login route.
 *
 * Token format:  base64url(payload) "." base64url(HMAC-SHA256(payload))
 *
 * It is deliberately not a JWT. There is exactly one subject (the studio
 * manager) and one algorithm, so a JWT library would add a dependency, a
 * parser, and the `alg: none` family of downgrade bugs in exchange for nothing.
 *
 * The token is stateless: no session table, so logout works by clearing the
 * cookie. The trade-off is that a stolen token stays valid until it expires —
 * which is why the TTL is hours, not weeks, and the cookie is HttpOnly.
 * =============================================================================
 */

export const ADMIN_COOKIE = 'onerlab_admin';

interface SessionPayload {
  /** Subject. Constant today; a real user id if the panel ever grows accounts. */
  sub: string;
  /** Issued at (epoch seconds). */
  iat: number;
  /** Expires at (epoch seconds). */
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Returns `Uint8Array<ArrayBuffer>` rather than a plain `Uint8Array`. Web
 * Crypto's `BufferSource` excludes views backed by a SharedArrayBuffer, and a
 * bare `Uint8Array` is typed over `ArrayBufferLike`, so allocating the buffer
 * explicitly is what makes this pass to `crypto.subtle` without a cast.
 */
function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(env.ADMIN_SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Issues a signed token valid for ADMIN_SESSION_TTL_HOURS. */
export async function createSessionToken(subject = 'admin'): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: subject,
    iat: now,
    exp: now + env.ADMIN_SESSION_TTL_HOURS * 3600,
  };

  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(),
    encoder.encode(encodedPayload),
  );

  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Returns the payload for a valid token, or `null` for anything else.
 *
 * Verification order matters: the signature is checked BEFORE the payload is
 * parsed or trusted, so a forged token never reaches `JSON.parse`, and the
 * expiry is read from a payload we have already proven we issued.
 *
 * `crypto.subtle.verify` compares in constant time, which is what stops an
 * attacker recovering a valid signature byte-by-byte from response timings.
 */
export async function verifySessionToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token || !env.ADMIN_SESSION_SECRET) return null;

  const dot = token.indexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;

  const encodedPayload = token.slice(0, dot);
  const encodedSignature = token.slice(dot + 1);

  try {
    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromBase64Url(encodedSignature),
      encoder.encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(encodedPayload))) as
      | SessionPayload
      | null;

    if (!payload || typeof payload.exp !== 'number' || typeof payload.sub !== 'string') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    // Malformed base64, malformed JSON, bad key length — all mean "not authenticated".
    return null;
  }
}

/** Cookie attributes shared by the login and logout routes. */
export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true, // unreadable from JavaScript, so XSS cannot exfiltrate it
    secure, // HTTPS only in production
    sameSite: 'strict' as const, // no cross-site request carries it => CSRF closed
    path: '/',
    maxAge: env.ADMIN_SESSION_TTL_HOURS * 3600,
  };
}
