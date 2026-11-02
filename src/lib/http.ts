import { NextResponse } from 'next/server';

/**
 * =============================================================================
 * Standardised API envelope + error taxonomy.
 * =============================================================================
 * Every route in this app answers with exactly one of two shapes:
 *
 *   success -> { success: true,  data: T,      requestId }
 *   failure -> { success: false, error: {...}, requestId }
 *
 * The client therefore never has to guess, and — critically — the failure shape
 * is built from a fixed catalogue of messages. A raw `Error.message` or a stack
 * trace can never reach the browser, so an internal database error cannot leak
 * a table name, a file path, or a connection string.
 * =============================================================================
 */

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  FORBIDDEN_ORIGIN: 'FORBIDDEN_ORIGIN',
  UNSUPPORTED_MEDIA_TYPE: 'UNSUPPORTED_MEDIA_TYPE',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  DUPLICATE_SUBMISSION: 'DUPLICATE_SUBMISSION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  LOGIN_RATE_LIMITED: 'LOGIN_RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Safe, user-facing messages — Russian, because they are rendered in the UI.
 * Nothing outside this map is ever shown to a visitor.
 */
const SAFE_MESSAGES: Record<ErrorCodeValue, string> = {
  VALIDATION_ERROR: 'Проверьте правильность заполнения формы.',
  RATE_LIMITED: 'Слишком много попыток. Пожалуйста, попробуйте через минуту.',
  CAPTCHA_FAILED: 'Не удалось подтвердить, что вы не робот. Обновите страницу и попробуйте снова.',
  FORBIDDEN_ORIGIN: 'Запрос отклонён.',
  UNSUPPORTED_MEDIA_TYPE: 'Неверный формат запроса.',
  PAYLOAD_TOO_LARGE: 'Слишком большой объём данных.',
  DUPLICATE_SUBMISSION: 'Мы уже получили вашу заявку. Наш менеджер скоро свяжется с вами.',
  UNAUTHORIZED: 'Требуется вход.',
  INVALID_CREDENTIALS: 'Неверный пароль.',
  LOGIN_RATE_LIMITED: 'Слишком много попыток входа. Попробуйте позже.',
  NOT_FOUND: 'Заявка не найдена.',
  NOT_CONFIGURED: 'Админ-панель не настроена.',
  INTERNAL_ERROR: 'Произошла ошибка на сервере. Попробуйте позже или позвоните нам.',
};

const STATUS_BY_CODE: Record<ErrorCodeValue, number> = {
  VALIDATION_ERROR: 400,
  RATE_LIMITED: 429,
  CAPTCHA_FAILED: 403,
  FORBIDDEN_ORIGIN: 403,
  UNSUPPORTED_MEDIA_TYPE: 415,
  PAYLOAD_TOO_LARGE: 413,
  DUPLICATE_SUBMISSION: 409,
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  LOGIN_RATE_LIMITED: 429,
  NOT_FOUND: 404,
  NOT_CONFIGURED: 503,
  INTERNAL_ERROR: 500,
};

/** Per-field validation messages, keyed by form field name. */
export type FieldErrors = Record<string, string>;

/**
 * The only error type route handlers are expected to throw.
 * `cause` carries the technical detail — it is logged server-side and dropped
 * before the response is serialised.
 */
export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly status: number;
  readonly fields?: FieldErrors;
  readonly meta?: Record<string, unknown>;

  constructor(
    code: ErrorCodeValue,
    options: { fields?: FieldErrors; meta?: Record<string, unknown>; cause?: unknown } = {},
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.fields = options.fields;
    this.meta = options.meta;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export interface ApiFailure {
  success: false;
  error: { code: ErrorCodeValue; message: string; fields?: FieldErrors };
  requestId: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/** Headers attached to every API response. */
function baseHeaders(requestId: string, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('X-Request-Id', requestId);
  headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

export function jsonSuccess<T>(
  data: T,
  requestId: string,
  init: { status?: number; headers?: HeadersInit } = {},
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    { success: true, data, requestId },
    { status: init.status ?? 200, headers: baseHeaders(requestId, init.headers) },
  );
}

export function jsonError(
  error: AppError,
  requestId: string,
  init: { headers?: HeadersInit } = {},
): NextResponse<ApiFailure> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: error.code,
        // Always the curated message — never `error.message` from an unknown throw.
        message: SAFE_MESSAGES[error.code],
        ...(error.fields ? { fields: error.fields } : {}),
      },
      requestId,
    },
    { status: error.status, headers: baseHeaders(requestId, init.headers) },
  );
}

/** Normalises anything thrown into an `AppError`, defaulting to a generic 500. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  return new AppError(ErrorCode.INTERNAL_ERROR, { cause: error });
}

/** A short, collision-resistant id used to correlate a log line with a response. */
export function newRequestId(): string {
  return crypto.randomUUID();
}
