#!/usr/bin/env node
/**
 * Generates the two admin secrets.
 *
 *   npm run admin:password -- "your-password-here"
 *
 * Prints the lines to paste into `.env` (locally) or into the Vercel project's
 * environment variables (production). The password itself is never written to
 * disk by this script — only its scrypt digest is printed.
 *
 * Deliberately standalone (no `@/lib` imports, no TypeScript): it has to run
 * before the app is configured, which is exactly when `env.ts` would throw.
 */
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PARAMS = { N: 65536, r: 8, p: 1, keyLength: 64 };

const password = process.argv[2];

if (!password) {
  console.error('Usage: npm run admin:password -- "your-password"');
  process.exit(1);
}

if (password.length < 12) {
  console.error(
    `Password is ${password.length} characters. Use at least 12 — this is the only ` +
      'credential protecting every lead in the database.',
  );
  process.exit(1);
}

const salt = randomBytes(16);
const derived = await scryptAsync(password.normalize('NFKC'), salt, PARAMS.keyLength, {
  N: PARAMS.N,
  r: PARAMS.r,
  p: PARAMS.p,
  maxmem: 256 * 1024 * 1024,
});

// ':' rather than PHC's '$' — dotenv expands '$NAME' and would truncate this.
const hash = `scrypt:${PARAMS.N}:${PARAMS.r}:${PARAMS.p}:${salt.toString('base64url')}:${derived.toString('base64url')}`;
const secret = randomBytes(48).toString('base64url');

console.log(`
Add these to .env (local) and to the Vercel project settings (production).
Keep the password itself in a password manager — it cannot be recovered from the hash.

ADMIN_PASSWORD_HASH="${hash}"
ADMIN_SESSION_SECRET="${secret}"
`);
