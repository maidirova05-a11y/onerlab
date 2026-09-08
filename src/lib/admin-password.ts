import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * =============================================================================
 * Admin password hashing (scrypt).
 * =============================================================================
 * NODE-ONLY. Never import this from `middleware.ts` — see `admin-session.ts`
 * for the Edge-safe half.
 *
 * scrypt over a plain comparison, because the hash sits in an environment
 * variable that ends up in a Vercel dashboard, a CI log, or a `.env` backup.
 * A memory-hard KDF means that leaking it does not hand over the password.
 *
 * Stored format:  scrypt:N:r:p:<salt-b64url>:<hash-b64url>
 * The parameters travel with the hash so they can be raised later without
 * invalidating existing credentials.
 *
 * The separator is ':' and NOT the conventional PHC '$'. This value lives in a
 * .env file and in Vercel's environment UI, and dotenv performs variable
 * expansion — '$65536' is read as an (empty) variable and the hash silently
 * arrives truncated, which presents as "correct password rejected". ':' is
 * outside the base64url alphabet, so it stays an unambiguous delimiter.
 * =============================================================================
 */

/**
 * `promisify` resolves to scrypt's 3-argument overload, which drops the options
 * object we need for N/r/p and maxmem. The signature is restated here so the
 * tuning parameters are actually type-checked.
 */
const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

/** OWASP-recommended baseline: N=2^16, r=8, p=1 (~64 MB of memory per attempt). */
const PARAMS = { N: 65536, r: 8, p: 1, keyLength: 64 } as const;

function toBase64Url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

/** Produces a `scrypt:...` string for ADMIN_PASSWORD_HASH. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    // Node's default maxmem (32 MB) is below what N=65536 needs, so it must be raised.
    maxmem: 256 * 1024 * 1024,
  });

  return `scrypt:${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${toBase64Url(salt)}:${toBase64Url(derived)}`;
}

/**
 * Constant-time verification against a stored `scrypt:...` string.
 *
 * Returns false for a malformed hash rather than throwing: a corrupted env var
 * should lock the panel, not surface a 500 that confirms the var exists.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, rawN, rawR, rawP, rawSalt, rawHash] = parts;
  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;

  try {
    const salt = Buffer.from(rawSalt as string, 'base64url');
    const expected = Buffer.from(rawHash as string, 'base64url');

    const derived = await scryptAsync(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 256 * 1024 * 1024,
    });

    // Length is checked first because timingSafeEqual throws on a mismatch.
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
