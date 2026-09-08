import pino, { type Logger } from 'pino';

import { env } from '@/lib/env';

/**
 * =============================================================================
 * Structured server-side logger (Pino).
 * =============================================================================
 * Two things matter for security here:
 *
 * 1. REDACTION. Anything that could carry a secret or personal data is replaced
 *    with `[Redacted]` *by the logger itself*, so a careless `log.info(req)`
 *    somewhere down the line cannot leak an Authorization header or a phone
 *    number into a log aggregator.
 *
 * 2. NO PRETTY-PRINTING IN PRODUCTION. Production emits newline-delimited JSON,
 *    which is what log shippers (Loki, Datadog, CloudWatch) expect.
 * =============================================================================
 */

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-forwarded-for"]',
  'headers.authorization',
  'headers.cookie',
  'password',
  'token',
  'captchaToken',
  '*.captchaToken',
  'phone',
  '*.phone',
  'parentName',
  '*.parentName',
  'childNameAge',
  '*.childNameAge',
  'DATABASE_URL',
  'CAPTCHA_SECRET_KEY',
];

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  redact: { paths: redactPaths, censor: '[Redacted]' },
  base: { service: 'onerlab-web', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  /*
   * NO TRANSPORT — plain JSON everywhere, including development.
   *
   * `pino-pretty` runs in a worker thread, and Next's bundler does not emit the
   * worker entrypoint into `.next/server/vendor-chunks`. The worker dies on
   * startup with MODULE_NOT_FOUND, and from that moment EVERY logger call
   * throws "the worker has exited" — which surfaces as a 500 on requests that
   * were otherwise fine, because the route logs before it responds.
   *
   * Losing colour in the dev console is a small price for a logger that cannot
   * take a request down with it. Pipe through `npx pino-pretty` if the raw JSON
   * gets tiring.
   */
});

/**
 * Creates a child logger bound to a single request.
 * Every line produced while handling that request carries the same
 * `requestId`, which is what makes a production incident traceable.
 */
export function requestLogger(requestId: string, route: string): Logger {
  return logger.child({ requestId, route });
}
