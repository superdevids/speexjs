export class HttpException extends Error {
  public readonly status: number
  public readonly error: string

  constructor(message: string, status: number = 500, error?: string) {
    super(message)
    this.name = 'HttpException'
    this.status = status
    this.error = error ?? getDefaultErrorName(status)
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.error,
      message: this.message,
      statusCode: this.status,
    }
  }
}

export class BadRequestException extends HttpException {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST')
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenException extends HttpException {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class NotFoundException extends HttpException {
  constructor(message = 'Not Found') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(message = 'Method Not Allowed') {
    super(message, 405, 'METHOD_NOT_ALLOWED')
  }
}

export class ConflictException extends HttpException {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT')
  }
}

export class UnprocessableEntityException extends HttpException {
  constructor(message = 'Unprocessable Entity') {
    super(message, 422, 'UNPROCESSABLE_ENTITY')
  }
}

export class TooManyRequestsException extends HttpException {
  constructor(message = 'Too Many Requests') {
    super(message, 429, 'TOO_MANY_REQUESTS')
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(message = 'Internal Server Error') {
    super(message, 500, 'INTERNAL_SERVER_ERROR')
  }
}

export class ServiceUnavailableException extends HttpException {
  constructor(message = 'Service Unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE')
  }
}

export class ValidationException extends HttpException {
  public readonly errors: Record<string, string[]>

  constructor(errors: Record<string, string[]>, message = 'Validation Failed') {
    super(message, 422, 'VALIDATION_ERROR')
    this.errors = errors
  }

  override toJSON(): Record<string, unknown> {
    return {
      error: this.error,
      message: this.message,
      statusCode: this.status,
      errors: this.errors,
    }
  }
}

export type ExceptionHandler = (err: HttpException) => HttpException | Promise<HttpException>

const exceptionHandlers: Map<new (...args: never[]) => HttpException, ExceptionHandler> = new Map()

export function registerExceptionHandler(exceptionType: new (...args: never[]) => HttpException, handler: ExceptionHandler): void {
  exceptionHandlers.set(exceptionType, handler)
}

export function clearExceptionHandlers(): void {
  exceptionHandlers.clear()
}

function getDefaultErrorName(status: number): string {
  const names: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  }
  return names[status] ?? 'UNKNOWN_ERROR'
}

export function normalizeError(_err: unknown): HttpException {
  const err = _err instanceof Error ? _err : new Error(String(_err))

  if (err instanceof HttpException) {
    const handler = exceptionHandlers.get(err.constructor as new (...args: never[]) => HttpException)
    if (handler !== undefined) {
      const result = handler(err)
      if (result instanceof Promise) {
        return result as unknown as HttpException
      }
      return result
    }
    return err
  }

  if (process.env.NODE_ENV === 'production') {
    return new InternalServerErrorException()
  }

  return new InternalServerErrorException(err.message)
}
