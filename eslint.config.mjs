import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

/**
 * ESLint flat config.
 *
 * Next.js 16 removed the `next lint` command this project's `lint` script
 * used to call. That script had never actually run: eslint itself was not
 * installed, so `next lint` stopped to ask how to configure it. This is a
 * linter that works, not a replacement for one that did.
 *
 * eslint-config-next 16 ships native flat configs, so no `FlatCompat` shim is
 * needed — importing the subpaths directly is the supported path.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // eslint-config-next's own defaults, restated because globalIgnores replaces
  // rather than extends them, plus Prisma's generated client.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'prisma/generated/**']),
]);
