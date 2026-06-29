/**
 * Predefined error codes mapped to their default HTTP status codes.
 */
export interface ErrorCodeMap {
  'BAD_REQUEST': 400
  'UNAUTHORIZED': 401
  'FORBIDDEN': 403
  'NOT_FOUND': 404
  'CONFLICT': 409
  'VALIDATION_ERROR': 422
  'TOO_MANY': 429
  'INTERNAL': 500
  'BAD_GATEWAY': 502
  'UNAVAILABLE': 503
}

/** Union of all known error codes. */
export type ErrorCode = keyof ErrorCodeMap

/** Default HTTP status for each error code. */
const defaultStatus: ErrorCodeMap = {
  'BAD_REQUEST': 400,
  'UNAUTHORIZED': 401,
  'FORBIDDEN': 403,
  'NOT_FOUND': 404,
  'CONFLICT': 409,
  'VALIDATION_ERROR': 422,
  'TOO_MANY': 429,
  'INTERNAL': 500,
  'BAD_GATEWAY': 502,
  'UNAVAILABLE': 503,
}

/**
 * A typed error with a machine-readable code, HTTP status, optional details, and cause.
 *
 * - `code`  – Short machine-readable identifier (e.g. `'NOT_FOUND'`).
 * - `status` – Defaults to the mapped HTTP status for the code; can be overridden.
 * - `details` – Arbitrary metadata attached to the error.
 *
 * @example
 * ```ts
 * throw new TypedError('NOT_FOUND', 'User not found', { details: { userId } })
 * ```
 */
export class TypedError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: unknown

  constructor(
    code: string,
    message: string,
    options?: { status?: number; details?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options?.cause })
    this.name = 'TypedError'
    this.code = code
    this.status = options?.status ?? defaultStatus[code as ErrorCode] ?? 500
    this.details = options?.details

    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Serialize the error to a plain JSON-safe object.
   */
  toJSON(): {
    name: string
    message: string
    code: string
    status: number
    details: unknown
    cause: unknown
    stack?: string
  } {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      cause: this.cause,
      ...(this.stack ? { stack: this.stack } : {}),
    }
  }

  override toString(): string {
    return `${this.name} [${this.code}]: ${this.message}`
  }
}

/**
 * Create a typed error from a known error code.
 *
 * The HTTP status is automatically derived from the code but can be overridden
 * via an explicit `status` in options.
 *
 * @example
 * ```ts
 * throw createError('NOT_FOUND', 'User not found', { details: { userId: 1 } })
 * ```
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: { details?: unknown; cause?: unknown },
): TypedError {
  return new TypedError(code, message, options)
}

/**
 * Checks whether an unknown value is a {@link TypedError}.
 *
 * @example
 * ```ts
 * if (isTypedError(err)) {
 *   console.log(err.code, err.status)
 * }
 * ```
 */
export function isTypedError(error: unknown): error is TypedError {
  return error instanceof TypedError
}
