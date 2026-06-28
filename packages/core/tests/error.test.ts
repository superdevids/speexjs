import { describe, it, expect } from 'vitest'
import { createError, isTypedError, TypedError, MultiError, collectErrors } from '../src/error/index.js'

describe('createError', () => {
  it('creates a TypedError with correct code', () => {
    const err = createError('BAD_REQUEST', 'Invalid input')
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toBe('Invalid input')
  })

  it('sets correct HTTP status', () => {
    const err = createError('NOT_FOUND', 'User not found')
    expect(err.status).toBe(404)
  })

  it('includes details when provided', () => {
    const err = createError('VALIDATION_ERROR', 'Validation failed', { details: { field: 'email' } })
    expect(err.details).toEqual({ field: 'email' })
  })

  it('is instance of TypedError and Error', () => {
    const err = createError('INTERNAL', 'Server error')
    expect(err).toBeInstanceOf(TypedError)
    expect(err).toBeInstanceOf(Error)
  })

  it('isTypedError returns true for TypedError', () => {
    const err = createError('UNAUTHORIZED', 'Login required')
    expect(isTypedError(err)).toBe(true)
  })

  it('isTypedError returns false for regular Error', () => {
    expect(isTypedError(new Error('plain'))).toBe(false)
  })

  it('isTypedError returns false for null', () => {
    expect(isTypedError(null)).toBe(false)
  })

  it('toJSON includes all fields', () => {
    const err = createError('CONFLICT', 'Duplicate entry', { details: { id: 1 } })
    const json = err.toJSON()
    expect(json.code).toBe('CONFLICT')
    expect(json.status).toBe(409)
    expect(json.message).toBe('Duplicate entry')
    expect(json.details).toEqual({ id: 1 })
  })
})

describe('MultiError', () => {
  it('collects errors', () => {
    const errs = [new Error('err1'), new Error('err2')]
    const multi = new MultiError(errs)
    expect(multi.errors).toHaveLength(2)
    expect(multi.length).toBe(2)
  })

  it('returns joined messages', () => {
    const multi = new MultiError([new Error('fail1'), new Error('fail2')])
    expect(multi.messages).toEqual(['fail1', 'fail2'])
  })

  it('some works with predicate', () => {
    const multi = new MultiError([new Error('fail1'), new TypeError('type error')])
    expect(multi.some(e => e instanceof TypeError)).toBe(true)
    expect(multi.some(e => e.message === 'fail1')).toBe(true)
    expect(multi.some(e => e.message === 'nonexistent')).toBe(false)
  })

  it('is instance of Error', () => {
    const multi = new MultiError([new Error('test')])
    expect(multi).toBeInstanceOf(Error)
    expect(multi).toBeInstanceOf(MultiError)
  })

  it('toJSON includes errors', () => {
    const multi = new MultiError([new Error('test')])
    const json = multi.toJSON()
    expect(json.errors).toHaveLength(1)
    expect(json.errors[0].message).toBe('test')
  })
})

describe('collectErrors', () => {
  it('returns result when no error', () => {
    const { result, errors } = collectErrors(() => 42)
    expect(result).toBe(42)
    expect(errors).toHaveLength(0)
  })

  it('collects thrown error', () => {
    const { result, errors } = collectErrors(() => { throw new Error('boom') })
    expect(result).toBeUndefined()
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toBe('boom')
  })

  it('handles non-Error throws', () => {
    const { errors } = collectErrors(() => { throw 'string error' })
    expect(errors).toHaveLength(1)
  })
})
