import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  MethodNotAllowedException,
  ConflictException,
  UnprocessableEntityException,
  TooManyRequestsException,
  InternalServerErrorException,
  ServiceUnavailableException,
  ValidationException,
  normalizeError,
  registerExceptionHandler,
} = await import('../src/server/errors.js')

describe('HttpException', () => {
  it('creates with default status 500', () => {
    const e = new HttpException('Something went wrong')
    expect(e.status).toBe(500)
    expect(e.message).toBe('Something went wrong')
    expect(e.error).toBe('INTERNAL_SERVER_ERROR')
  })

  it('creates with custom status and error code', () => {
    const e = new HttpException('Custom', 418, 'TEAPOT')
    expect(e.status).toBe(418)
    expect(e.error).toBe('TEAPOT')
  })

  it('toJSON returns serializable object', () => {
    const e = new HttpException('test', 400, 'BAD_REQUEST')
    expect(e.toJSON()).toEqual({
      error: 'BAD_REQUEST',
      message: 'test',
      statusCode: 400,
    })
  })
})

describe('Exception subclasses', () => {
  it('BadRequestException', () => {
    const e = new BadRequestException()
    expect(e.status).toBe(400)
    expect(e.error).toBe('BAD_REQUEST')
  })

  it('BadRequestException with custom message', () => {
    const e = new BadRequestException('Invalid email')
    expect(e.message).toBe('Invalid email')
  })

  it('UnauthorizedException', () => {
    const e = new UnauthorizedException()
    expect(e.status).toBe(401)
    expect(e.error).toBe('UNAUTHORIZED')
  })

  it('ForbiddenException', () => {
    const e = new ForbiddenException()
    expect(e.status).toBe(403)
    expect(e.error).toBe('FORBIDDEN')
  })

  it('NotFoundException', () => {
    const e = new NotFoundException()
    expect(e.status).toBe(404)
    expect(e.error).toBe('NOT_FOUND')
  })

  it('MethodNotAllowedException', () => {
    const e = new MethodNotAllowedException()
    expect(e.status).toBe(405)
    expect(e.error).toBe('METHOD_NOT_ALLOWED')
  })

  it('ConflictException', () => {
    const e = new ConflictException()
    expect(e.status).toBe(409)
    expect(e.error).toBe('CONFLICT')
  })

  it('UnprocessableEntityException', () => {
    const e = new UnprocessableEntityException()
    expect(e.status).toBe(422)
    expect(e.error).toBe('UNPROCESSABLE_ENTITY')
  })

  it('TooManyRequestsException', () => {
    const e = new TooManyRequestsException()
    expect(e.status).toBe(429)
    expect(e.error).toBe('TOO_MANY_REQUESTS')
  })

  it('InternalServerErrorException', () => {
    const e = new InternalServerErrorException()
    expect(e.status).toBe(500)
    expect(e.error).toBe('INTERNAL_SERVER_ERROR')
  })

  it('ServiceUnavailableException', () => {
    const e = new ServiceUnavailableException()
    expect(e.status).toBe(503)
    expect(e.error).toBe('SERVICE_UNAVAILABLE')
  })
})

describe('ValidationException', () => {
  it('holds field errors', () => {
    const errors = { email: ['is required', 'invalid format'], name: ['is required'] }
    const e = new ValidationException(errors)
    expect(e.status).toBe(422)
    expect(e.errors).toEqual(errors)
    expect(e.message).toBe('Validation Failed')
  })

  it('toJSON includes errors', () => {
    const e = new ValidationException({ field: ['error'] })
    const json = e.toJSON()
    expect(json.errors).toEqual({ field: ['error'] })
    expect(json.statusCode).toBe(422)
  })

  it('accepts custom message', () => {
    const e = new ValidationException({}, 'Custom validation message')
    expect(e.message).toBe('Custom validation message')
  })
})

describe('normalizeError', () => {
  const OLD_ENV = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = OLD_ENV
  })

  it('returns HttpException as-is', () => {
    const e = new NotFoundException()
    expect(normalizeError(e)).toBe(e)
  })

  it('wraps plain Error as InternalServerErrorException with message', () => {
    process.env.NODE_ENV = 'development'
    const result = normalizeError(new Error('query failed'))
    expect(result).toBeInstanceOf(InternalServerErrorException)
    expect(result.message).toBe('query failed')
  })

  it('wraps non-Error values', () => {
    process.env.NODE_ENV = 'development'
    const result = normalizeError('string error')
    expect(result).toBeInstanceOf(InternalServerErrorException)
  })

  it('production mode hides error message', () => {
    process.env.NODE_ENV = 'production'
    const result = normalizeError(new Error('sensitive detail'))
    expect(result.message).toBe('Internal Server Error')
  })

  it('default non-production shows message', () => {
    delete process.env.NODE_ENV
    const result = normalizeError(new Error('visible detail'))
    expect(result.message).toBe('visible detail')
  })
})

describe('registerExceptionHandler', () => {
  it('allows custom handler to modify exception', () => {
    registerExceptionHandler(NotFoundException, (err) => new BadRequestException(`Wrapped: ${err.message}`))
    const result = normalizeError(new NotFoundException('original'))
    expect(result).toBeInstanceOf(BadRequestException)
    expect(result.message).toBe('Wrapped: original')
  })
})

describe('Error classification by status code patterns', () => {
  it('database errors classify as 500', () => {
    const e = new InternalServerErrorException('Database connection failed')
    expect(e.status).toBe(500)
  })

  it('validation errors classify as 422', () => {
    const e = new ValidationException({ email: ['invalid'] })
    expect(e.status).toBe(422)
    expect(e.error).toBe('VALIDATION_ERROR')
  })

  it('auth errors classify as 401', () => {
    const e = new UnauthorizedException('Invalid token')
    expect(e.status).toBe(401)
    expect(e.error).toBe('UNAUTHORIZED')
  })

  it('forbidden errors classify as 403', () => {
    const e = new ForbiddenException('Insufficient permissions')
    expect(e.status).toBe(403)
  })

  it('not found errors classify as 404', () => {
    const e = new NotFoundException('User not found')
    expect(e.status).toBe(404)
  })

  it('conflict errors classify as 409', () => {
    const e = new ConflictException('Duplicate entry')
    expect(e.status).toBe(409)
  })

  it('rate limit errors classify as 429', () => {
    const e = new TooManyRequestsException('Too many requests')
    expect(e.status).toBe(429)
  })
})
