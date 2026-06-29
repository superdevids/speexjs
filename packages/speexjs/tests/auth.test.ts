import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Module Mocks (hoisted by vitest) ─────────────────────────────

const mockEncrypt = vi.fn()
const mockDecrypt = vi.fn()
const mockGenerateEncryptionKey = vi.fn()
const mockVerifyPassword = vi.fn()
const mockRandomHex = vi.fn()
const mockScryptSync = vi.fn()
const mockRandomBytes = vi.fn()

vi.mock('../src/native/crypto.js', () => ({
  encrypt: mockEncrypt,
  decrypt: mockDecrypt,
  generateEncryptionKey: mockGenerateEncryptionKey,
  randomHex: mockRandomHex,
}))

vi.mock('../src/native/hashing.js', () => ({
  verifyPassword: mockVerifyPassword,
}))

vi.mock('node:crypto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:crypto')>()),
  scryptSync: mockScryptSync,
  randomBytes: mockRandomBytes,
}))

// ─── Helpers ──────────────────────────────────────────────────────

function makeReqStub(overrides: Record<string, unknown> = {}) {
  return {
    cookie: vi.fn(),
    bearerToken: vi.fn(),
    wantsJson: vi.fn(() => true),
    ...overrides,
  } as any
}

function makeResStub(overrides: Record<string, unknown> = {}) {
  return {
    cookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    flush: vi.fn().mockResolvedValue(undefined),
    redirect: vi.fn().mockReturnThis(),
    ...overrides,
  } as any
}

function makeUserProvider(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn(),
    findByCredential: vi.fn(),
    ...overrides,
  }
}

function makeTokenProvider(overrides: Record<string, unknown> = {}) {
  return {
    create: vi.fn(),
    find: vi.fn(),
    delete: vi.fn(),
    deleteAllForUser: vi.fn(),
    ...overrides,
  }
}

function makeUserLookup(overrides: Record<string, unknown> = {}) {
  return {
    findById: vi.fn(),
    ...overrides,
  }
}

function fakeEncrypt(data: string, _key: string) {
  const payload = Buffer.from(data, 'utf8').toString('base64')
  return { encrypted: payload, iv: 'a2l2', tag: 'dGFn' }
}

function fakeDecrypt(payload: { encrypted: string }, _key: string) {
  return Buffer.from(payload.encrypted, 'base64').toString('utf8')
}

// ─── Imports ──────────────────────────────────────────────────────

const { SessionGuard } = await import('../src/server/auth/session-guard.js')
const { TokenGuard } = await import('../src/server/auth/token-guard.js')
const { Gate, AuthorizationError } = await import('../src/server/gate/index.js')
const { authMiddleware, guestMiddleware } = await import('../src/server/auth/middleware.js')
const { AuthManager } = await import('../src/server/auth/index.js')

// ====================================================================
// SESSION GUARD
// ====================================================================

describe('SessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.APP_KEY = 'dGVzdC1rZXktMzItYnl0ZXMtMTIzNDU2Nzg5MDEyMzQ1Ng=='
    mockGenerateEncryptionKey.mockReturnValue('dGVzdC1rZXktMzItYnl0ZXMtMTIzNDU2Nzg5MDEyMzQ1Ng==')
    mockEncrypt.mockImplementation(fakeEncrypt)
    mockDecrypt.mockImplementation(fakeDecrypt)
  })

  // ── Constructor ───────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default config when no arguments given', () => {
      const guard = new SessionGuard()
      expect(guard).toBeInstanceOf(SessionGuard)
    })

    it('uses APP_KEY from environment when no encryptionKey given', () => {
      process.env.APP_KEY = 'cHJvZC1rZXktMzItYnl0ZXMtMTIzNDU2Nzg5MA=='
      const guard = new SessionGuard()
      expect(guard['config'].encryptionKey).toBe('cHJvZC1rZXktMzItYnl0ZXMtMTIzNDU2Nzg5MA==')
    })

    it('throws when neither encryptionKey nor APP_KEY is set', () => {
      delete process.env.APP_KEY
      expect(() => new SessionGuard()).toThrow('APP_KEY must be set')
    })

    it('accepts custom config values', () => {
      const provider = makeUserProvider()
      const guard = new SessionGuard({
        cookieName: 'my_app_session',
        lifetime: 60,
        encryptionKey: 'Y3VzdG9tLWtleS0zMi1ieXRlcy0xMjM0NTY3OA==',
        provider,
      })
      expect(guard['config'].cookieName).toBe('my_app_session')
      expect(guard['config'].lifetime).toBe(60)
      expect(guard['config'].encryptionKey).toBe('Y3VzdG9tLWtleS0zMi1ieXRlcy0xMjM0NTY3OA==')
      expect(guard['config'].provider).toBe(provider)
    })
  })

  // ── setContext ────────────────────────────────────────────────

  describe('setContext', () => {
    it('stores request/response references and clears payload cache', () => {
      const guard = new SessionGuard()
      guard['cachedPayload'] = {} as any
      const req = makeReqStub()
      const res = makeResStub()
      guard.setContext(req, res)
      expect(guard['req']).toBe(req)
      expect(guard['res']).toBe(res)
      expect(guard['cachedPayload']).toBeNull()
    })

    it('returns self for chaining', () => {
      const guard = new SessionGuard()
      const result = guard.setContext(makeReqStub(), makeResStub())
      expect(result).toBe(guard)
    })
  })

  // ── attempt ───────────────────────────────────────────────────

  describe('attempt', () => {
    it('returns false when provider is not configured', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      const result = await guard.attempt({ email: 'a@b.com', password: 'secret' })
      expect(result).toBe(false)
    })

    it('returns false when identifier value is missing', async () => {
      const provider = makeUserProvider()
      const guard = new SessionGuard({ provider })
      guard.setContext(makeReqStub(), makeResStub())
      const result = await guard.attempt({} as any)
      expect(result).toBe(false)
      expect(provider.findByCredential).not.toHaveBeenCalled()
    })

    it('returns false when user is not found', async () => {
      const provider = makeUserProvider({ findByCredential: vi.fn().mockResolvedValue(null) })
      const guard = new SessionGuard({ provider })
      guard.setContext(makeReqStub(), makeResStub())
      const result = await guard.attempt({ email: 'a@b.com', password: 'secret' })
      expect(result).toBe(false)
    })

    it('returns false when user record has no password hash', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com' }),
      })
      const guard = new SessionGuard({ provider })
      guard.setContext(makeReqStub(), makeResStub())
      const result = await guard.attempt({ email: 'a@b.com', password: 'secret' })
      expect(result).toBe(false)
    })

    it('returns false when password does not match', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com', password: '$scrypt$abc' }),
      })
      mockVerifyPassword.mockReturnValue(false)
      const guard = new SessionGuard({ provider })
      guard.setContext(makeReqStub(), makeResStub())
      const result = await guard.attempt({ email: 'a@b.com', password: 'wrong' })
      expect(result).toBe(false)
      expect(mockVerifyPassword).toHaveBeenCalledWith('wrong', '$scrypt$abc')
    })

    it('returns true and writes cookie on valid credentials', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 42, email: 'a@b.com', password: '$scrypt$abc' }),
      })
      mockVerifyPassword.mockReturnValue(true)
      const guard = new SessionGuard({ provider, lifetime: 120 })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      const result = await guard.attempt({ email: 'a@b.com', password: 'correct' })
      expect(result).toBe(true)
      expect(res.cookie).toHaveBeenCalledWith('speexjs_session', expect.any(String), expect.objectContaining({ httpOnly: true, path: '/' }))
    })

    it('passes remember flag to calculateExpiry', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hash' }),
      })
      mockVerifyPassword.mockReturnValue(true)
      const guard = new SessionGuard({ provider })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.attempt({ email: 'a@b.com', password: 'p' }, true)
      const cookieArg = res.cookie.mock.calls[0][2]
      expect(cookieArg.maxAge).toBeGreaterThanOrEqual(5 * 365 * 24 * 60 * 60 - 5)
    })

    it('allows custom identifier field', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 1, username: 'john', password: 'hash' }),
      })
      mockVerifyPassword.mockReturnValue(true)
      const guard = new SessionGuard({ provider, identifier: 'username' })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.attempt({ username: 'john', password: 'p' } as any, false)
      expect(provider.findByCredential).toHaveBeenCalledWith('username', 'john')
    })
  })

  // ── login ─────────────────────────────────────────────────────

  describe('login', () => {
    it('writes session cookie with userId when no provider', async () => {
      const guard = new SessionGuard({ lifetime: 120 })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.login(99)
      expect(res.cookie).toHaveBeenCalledWith('speexjs_session', expect.any(String), expect.objectContaining({ httpOnly: true, path: '/' }))
    })

    it('looks up user from provider when available', async () => {
      const provider = makeUserProvider({
        findById: vi.fn().mockResolvedValue({ id: 7, name: 'Alice' }),
      })
      const guard = new SessionGuard({ provider })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.login(7)
      expect(provider.findById).toHaveBeenCalledWith(7)
    })

    it('falls back to userId-only payload when provider returns null', async () => {
      const provider = makeUserProvider({ findById: vi.fn().mockResolvedValue(null) })
      const guard = new SessionGuard({ provider })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.login(7)
      expect(provider.findById).toHaveBeenCalledWith(7)
      expect(res.cookie).toHaveBeenCalled()
    })
  })

  // ── loginUser ────────────────────────────────────────────────

  describe('loginUser', () => {
    it('writes session cookie with full user object', async () => {
      const guard = new SessionGuard()
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      const user = { id: 'uuid-1', name: 'Bob', role: 'admin' }
      await guard.loginUser(user)
      expect(res.cookie).toHaveBeenCalledWith('speexjs_session', expect.any(String), expect.any(Object))
    })

    it('populates cached payload with user for subsequent user() call', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      const user = { id: 'uuid-1', name: 'Bob' }
      await guard.loginUser(user)
      const result = await guard.user()
      expect(result).toEqual(user)
    })
  })

  // ── logout ────────────────────────────────────────────────────

  describe('logout', () => {
    it('clears the session cookie', async () => {
      const guard = new SessionGuard()
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.logout()
      expect(res.clearCookie).toHaveBeenCalledWith('speexjs_session', { path: '/' })
    })

    it('clears cached payload', async () => {
      const guard = new SessionGuard()
      guard['cachedPayload'] = { userId: 1, data: {}, expiresAt: Date.now() + 99999 }
      await guard.logout()
      expect(guard['cachedPayload']).toBeNull()
    })

    it('does nothing when res is null', async () => {
      const guard = new SessionGuard()
      await expect(guard.logout()).resolves.toBeUndefined()
    })
  })

  // ── user ──────────────────────────────────────────────────────

  describe('user', () => {
    it('returns null when no session exists', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub({ cookie: vi.fn(() => undefined) }), makeResStub())
      const user = await guard.user()
      expect(user).toBeNull()
    })

    it('returns user from payload when already cached', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      guard['cachedPayload'] = { userId: 5, user: { id: 5, name: 'Cached' }, data: {}, expiresAt: Date.now() + 99999 }
      const result = await guard.user()
      expect(result).toEqual({ id: 5, name: 'Cached' })
    })

    it('returns user from provider when not in payload', async () => {
      const provider = makeUserProvider({
        findById: vi.fn().mockResolvedValue({ id: 3, name: 'FromProvider' }),
      })
      const guard = new SessionGuard({ provider })
      const encrypted = JSON.stringify(fakeEncrypt(JSON.stringify({ userId: 3, data: {}, expiresAt: Date.now() + 99999 }), ''))
      const req = makeReqStub({ cookie: vi.fn(() => encrypted) })
      guard.setContext(req, makeResStub())
      const result = await guard.user()
      expect(result).toEqual({ id: 3, name: 'FromProvider' })
      expect(provider.findById).toHaveBeenCalledWith(3)
    })

    it('falls back to minimal user object when no provider', async () => {
      const guard = new SessionGuard()
      const encrypted = JSON.stringify(fakeEncrypt(JSON.stringify({ userId: 9, data: {}, expiresAt: Date.now() + 99999 }), ''))
      guard.setContext(makeReqStub({ cookie: vi.fn(() => encrypted) }), makeResStub())
      const result = await guard.user()
      expect(result).toEqual({ id: 9 })
    })

    it('returns null when cookie is malformed', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub({ cookie: vi.fn(() => 'garbage-not-json') }), makeResStub())
      mockDecrypt.mockImplementation(() => {
        throw new Error('bad')
      })
      const result = await guard.user()
      expect(result).toBeNull()
    })
  })

  // ── check / guest / id ───────────────────────────────────────

  describe('check', () => {
    it('returns true when session payload exists', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      guard['cachedPayload'] = { userId: 1, data: {}, expiresAt: Date.now() + 99999 }
      expect(await guard.check()).toBe(true)
    })

    it('returns false when no session', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      expect(await guard.check()).toBe(false)
    })

    it('returns false for expired cached payload', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      guard['cachedPayload'] = { userId: 1, data: {}, expiresAt: Date.now() - 1000 }
      expect(await guard.check()).toBe(false)
    })
  })

  describe('guest', () => {
    it('returns true when user is not authenticated', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      expect(await guard.guest()).toBe(true)
    })

    it('returns false when user is authenticated', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      guard['cachedPayload'] = { userId: 1, data: {}, expiresAt: Date.now() + 99999 }
      expect(await guard.guest()).toBe(false)
    })
  })

  describe('id', () => {
    it('returns userId from cached payload', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      guard['cachedPayload'] = { userId: 42, data: {}, expiresAt: Date.now() + 99999 }
      expect(await guard.id()).toBe(42)
    })

    it('returns null when no session', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      expect(await guard.id()).toBeNull()
    })
  })

  // ── set / get ────────────────────────────────────────────────

  describe('set / get', () => {
    it('stores and retrieves data via cookie roundtrip', async () => {
      const guard = new SessionGuard()
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)

      await guard.login(1)
      const cookieValue = res.cookie.mock.calls[0][1]

      const req = makeReqStub({ cookie: vi.fn(() => cookieValue) })
      guard.setContext(req, res)
      await guard.set('theme', 'dark')
      await guard.set('lang', 'en')

      const updatedCookie = res.cookie.mock.calls[2][1]
      const req2 = makeReqStub({ cookie: vi.fn(() => updatedCookie) })
      guard.setContext(req2, res)

      expect(await guard.get('theme')).toBe('dark')
      expect(await guard.get('lang')).toBe('en')
    })

    it('set does nothing when no active session', async () => {
      const guard = new SessionGuard()
      guard.setContext(makeReqStub(), makeResStub())
      await guard.set('x', 'y')
      expect(await guard.get('x')).toBeUndefined()
    })

    it('get returns undefined for non-existent key', async () => {
      const guard = new SessionGuard()
      guard['cachedPayload'] = { userId: 1, data: {}, expiresAt: Date.now() + 99999 }
      guard.setContext(makeReqStub(), makeResStub())
      expect(await guard.get('nope')).toBeUndefined()
    })
  })

  // ── Encryption / Decryption ──────────────────────────────────

  describe('session encryption roundtrip', () => {
    it('encrypts and decrypts session data transparently', async () => {
      const guard = new SessionGuard()
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.loginUser({ id: 1, name: 'Alice' })

      const writtenCookie = res.cookie.mock.calls[0][1]
      const req = makeReqStub({ cookie: vi.fn(() => writtenCookie) })
      guard.setContext(req, makeResStub())

      const user = await guard.user()
      expect(user).toEqual({ id: 1, name: 'Alice' })
    })
  })

  // ── Session Expiry ───────────────────────────────────────────

  describe('session expiry', () => {
    it('returns null when cookie payload is expired', async () => {
      const guard = new SessionGuard({ lifetime: 120 })
      const pastTime = Date.now() - 10000
      const expiredPayload = JSON.stringify({ userId: 1, data: {}, expiresAt: pastTime })
      const encrypted = JSON.stringify(fakeEncrypt(expiredPayload, ''))
      guard.setContext(makeReqStub({ cookie: vi.fn(() => encrypted) }), makeResStub())
      expect(await guard.check()).toBe(false)
    })

    it('writes cookie with positive maxAge even when barely valid', async () => {
      const guard = new SessionGuard({ lifetime: 120 })
      const futureTime = Date.now() + 1000
      const almostExpired = JSON.stringify({ userId: 1, data: {}, expiresAt: futureTime })
      const encrypted = JSON.stringify(fakeEncrypt(almostExpired, ''))
      const req = makeReqStub({ cookie: vi.fn(() => encrypted) })
      const res = makeResStub()
      guard.setContext(req, res)

      await guard.set('k', 'v')
      expect(res.cookie.mock.calls[0][2].maxAge).toBeGreaterThanOrEqual(1)
    })
  })

  // ── Remember Me ──────────────────────────────────────────────

  describe('remember me', () => {
    it('uses longer lifetime when remember flag is true', async () => {
      const provider = makeUserProvider({
        findByCredential: vi.fn().mockResolvedValue({ id: 1, email: 'a@b.com', password: 'hash' }),
      })
      mockVerifyPassword.mockReturnValue(true)
      const guard = new SessionGuard({ provider, lifetime: 120 })
      const res = makeResStub()
      guard.setContext(makeReqStub(), res)
      await guard.attempt({ email: 'a@b.com', password: 'p' }, true)
      const maxAge = res.cookie.mock.calls[0][2].maxAge
      const fiveYears = 5 * 365 * 24 * 60 * 60
      expect(maxAge).toBeGreaterThanOrEqual(fiveYears - 5)
    })
  })
})

// ====================================================================
// TOKEN GUARD
// ====================================================================

describe('TokenGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRandomHex.mockReturnValue('a'.repeat(128))
    mockScryptSync.mockImplementation((plaintext: string, salt: string) => {
      const buf = Buffer.from(`hashed:${plaintext}:${salt}`)
      return buf
    })
    mockRandomBytes.mockImplementation((size: number) => Buffer.from('s'.repeat(size)))
  })

  // ── Constructor ───────────────────────────────────────────────

  describe('constructor', () => {
    it('creates with default config', () => {
      const guard = new TokenGuard()
      expect(guard).toBeInstanceOf(TokenGuard)
    })

    it('accepts custom config', () => {
      const provider = makeTokenProvider()
      const lookup = makeUserLookup()
      const guard = new TokenGuard({
        table: 'api_tokens',
        tokenLength: 32,
        hashTokens: false,
        provider,
        userLookup: lookup,
      })
      expect(guard['config'].table).toBe('api_tokens')
      expect(guard['config'].tokenLength).toBe(32)
      expect(guard['config'].hashTokens).toBe(false)
      expect(guard['config'].provider).toBe(provider)
      expect(guard['config'].userLookup).toBe(lookup)
    })

    it('enables hashing by default', () => {
      const guard = new TokenGuard()
      expect(guard['config'].hashTokens).toBe(true)
    })
  })

  // ── createToken ───────────────────────────────────────────────

  describe('createToken', () => {
    it('throws when no provider configured', async () => {
      const guard = new TokenGuard()
      await expect(guard.createToken(1)).rejects.toThrow('TokenProvider is required')
    })

    it('generates a token and stores hashed version via provider', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })
      const token = await guard.createToken(42, 'api-token', ['read', 'write'])
      expect(token).toBe('a'.repeat(128))
      expect(mockRandomHex).toHaveBeenCalledWith(64)
      expect(provider.create).toHaveBeenCalledWith(42, expect.stringMatching(/^[a-f0-9]{64}$/), 'api-token', ['read', 'write'])
    })

    it('passes plaintext when hashTokens is false', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider, hashTokens: false })
      mockRandomHex.mockReturnValue('plain-token-123')
      await guard.createToken(1, 'test')
      expect(provider.create).toHaveBeenCalledWith(1, 'plain-token-123', 'test', undefined)
    })

    it('uses default token name when none provided', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })
      await guard.createToken(10)
      expect(provider.create).toHaveBeenCalledWith(10, expect.any(String), 'api-token', undefined)
    })
  })

  // ── user ──────────────────────────────────────────────────────

  describe('user', () => {
    it('returns user from userLookup when token is valid', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 5, abilities: ['admin'] }),
      })
      const lookup = makeUserLookup({ findById: vi.fn().mockResolvedValue({ id: 5, name: 'Admin' }) })
      const guard = new TokenGuard({ provider, userLookup: lookup })
      const user = await guard.user('some-token')
      expect(user).toEqual({ id: 5, name: 'Admin' })
      expect(lookup.findById).toHaveBeenCalledWith(5)
    })

    it('returns minimal user when no userLookup', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 3, abilities: [] }),
      })
      const guard = new TokenGuard({ provider })
      const user = await guard.user('token')
      expect(user).toEqual({ id: 3 })
    })

    it('returns null when token is not found', async () => {
      const provider = makeTokenProvider({ find: vi.fn().mockResolvedValue(null) })
      const guard = new TokenGuard({ provider })
      const user = await guard.user('invalid-token')
      expect(user).toBeNull()
    })

    it('returns null when no provider', async () => {
      const guard = new TokenGuard()
      expect(await guard.user('x')).toBeNull()
    })
  })

  // ── validate ─────────────────────────────────────────────────

  describe('validate', () => {
    it('returns true for a valid token', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: [] }),
      })
      const guard = new TokenGuard({ provider })
      expect(await guard.validate('good-token')).toBe(true)
    })

    it('returns false for an invalid token', async () => {
      const provider = makeTokenProvider({ find: vi.fn().mockResolvedValue(null) })
      const guard = new TokenGuard({ provider })
      expect(await guard.validate('bad-token')).toBe(false)
    })

    it('returns false when no provider', async () => {
      const guard = new TokenGuard()
      expect(await guard.validate('x')).toBe(false)
    })
  })

  // ── abilities ────────────────────────────────────────────────

  describe('abilities', () => {
    it('returns abilities array for valid token', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: ['read', 'write'] }),
      })
      const guard = new TokenGuard({ provider })
      expect(await guard.abilities('token')).toEqual(['read', 'write'])
    })

    it('returns empty array for invalid token', async () => {
      const provider = makeTokenProvider({ find: vi.fn().mockResolvedValue(null) })
      const guard = new TokenGuard({ provider })
      expect(await guard.abilities('bad')).toEqual([])
    })

    it('returns empty array when no provider', async () => {
      const guard = new TokenGuard()
      expect(await guard.abilities('x')).toEqual([])
    })
  })

  // ── can ──────────────────────────────────────────────────────

  describe('can', () => {
    it('returns true when token has no abilities (wildcard)', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: [] }),
      })
      const guard = new TokenGuard({ provider })
      expect(await guard.can('token', 'anything')).toBe(true)
    })

    it('returns true when token has the specific ability', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: ['read', 'write'] }),
      })
      const guard = new TokenGuard({ provider })
      expect(await guard.can('token', 'read')).toBe(true)
    })

    it('returns false when token does not have the ability', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: ['read'] }),
      })
      const guard = new TokenGuard({ provider })
      expect(await guard.can('token', 'delete')).toBe(false)
    })

    it('returns false when token is invalid', async () => {
      const provider = makeTokenProvider({ find: vi.fn().mockResolvedValue(null) })
      const guard = new TokenGuard({ provider })
      expect(await guard.can('bad', 'read')).toBe(false)
    })
  })

  // ── revokeToken ──────────────────────────────────────────────

  describe('revokeToken', () => {
    it('deletes the hashed token via provider', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })
      await guard.revokeToken('token-to-revoke')
      expect(provider.delete).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/))
    })

    it('passes plaintext when hashTokens is false', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider, hashTokens: false })
      await guard.revokeToken('plain-text')
      expect(provider.delete).toHaveBeenCalledWith('plain-text')
    })

    it('does nothing when no provider', async () => {
      const guard = new TokenGuard()
      await expect(guard.revokeToken('x')).resolves.toBeUndefined()
    })
  })

  // ── revokeAllTokens ──────────────────────────────────────────

  describe('revokeAllTokens', () => {
    it('deletes all tokens for the user', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })
      await guard.revokeAllTokens(42)
      expect(provider.deleteAllForUser).toHaveBeenCalledWith(42)
    })

    it('does nothing when no provider', async () => {
      const guard = new TokenGuard()
      await expect(guard.revokeAllTokens(1)).resolves.toBeUndefined()
    })
  })

  // ── Token Hashing ────────────────────────────────────────────

  describe('token hashing', () => {
    it('produces a hex HMAC hash', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })
      await guard.createToken(1)

      const storedHash = provider.create.mock.calls[0][1]
      expect(storedHash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('different plaintexts produce different hashes', async () => {
      const provider = makeTokenProvider()
      const guard = new TokenGuard({ provider })

      mockRandomHex.mockReturnValueOnce('plaintext-one-value')
      await guard.createToken(1)
      const hash1 = provider.create.mock.calls[0][1]

      mockRandomHex.mockReturnValueOnce('plaintext-two-value')
      await guard.createToken(1)
      const hash2 = provider.create.mock.calls[1][1]

      expect(hash1).not.toBe(hash2)
    })
  })
})

// ====================================================================
// GATE (Authorization)
// ====================================================================

describe('Gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── define ────────────────────────────────────────────────────

  describe('define', () => {
    it('registers an ability callback', () => {
      const gate = new Gate()
      const cb = vi.fn()
      gate.define('update-post', cb)
      expect(gate['abilities'].get('update-post')).toBe(cb)
    })

    it('returns self for chaining', () => {
      const gate = new Gate()
      const result = gate.define('a', vi.fn())
      expect(result).toBe(gate)
    })
  })

  // ── allows / denies ──────────────────────────────────────────

  describe('allows', () => {
    it('returns true when callback returns true', async () => {
      const gate = new Gate()
      gate.define('edit', () => true)
      expect(await gate.allows('edit', { id: 1 })).toBe(true)
    })

    it('returns false when callback returns false', async () => {
      const gate = new Gate()
      gate.define('edit', () => false)
      expect(await gate.allows('edit', { id: 1 })).toBe(false)
    })

    it('passes user and args to callback', async () => {
      const gate = new Gate()
      const cb = vi.fn((_u: any, _a: number) => true)
      gate.define('admin', cb)
      await gate.allows('admin', { id: 1 }, 42)
      expect(cb).toHaveBeenCalledWith({ id: 1 }, 42)
    })

    it('returns false when ability is not defined', async () => {
      const gate = new Gate()
      expect(await gate.allows('undefined-ability', { id: 1 })).toBe(false)
    })

    it('supports policy-style dotted ability with registered policy', async () => {
      const gate = new Gate()
      gate.policy('post', {
        update: (user: any, post: any) => user.id === post.authorId,
        delete: () => false,
      })
      expect(await gate.allows('post.update', { id: 1 }, { authorId: 1 })).toBe(true)
      expect(await gate.allows('post.update', { id: 2 }, { authorId: 1 })).toBe(false)
      expect(await gate.allows('post.delete', { id: 1 }, {})).toBe(false)
    })
  })

  describe('denies', () => {
    it('returns opposite of allows', async () => {
      const gate = new Gate()
      gate.define('only-true', () => true)
      gate.define('only-false', () => false)
      expect(await gate.denies('only-true', { id: 1 })).toBe(false)
      expect(await gate.denies('only-false', { id: 1 })).toBe(true)
    })
  })

  // ── before / after hooks ────────────────────────────────────

  describe('before', () => {
    it('short-circuits when before returns a boolean', async () => {
      const gate = new Gate()
      gate.before(() => true)
      gate.define('test', () => false)
      expect(await gate.allows('test', { id: 1 })).toBe(true)
    })

    it('passes through when before returns null', async () => {
      const gate = new Gate()
      gate.before(() => null)
      gate.define('test', () => false)
      expect(await gate.allows('test', { id: 1 })).toBe(false)
    })

    it('supports multiple before callbacks in order', async () => {
      const gate = new Gate()
      const order: number[] = []
      gate.before(async () => {
        order.push(1)
        return null
      })
      gate.before(async () => {
        order.push(2)
        return null
      })
      gate.define('test', () => true)
      await gate.allows('test', { id: 1 })
      expect(order).toEqual([1, 2])
    })
  })

  describe('after', () => {
    it('fires after ability check with the result', async () => {
      const gate = new Gate()
      const after = vi.fn()
      gate.after(after)
      gate.define('test', () => true)
      await gate.allows('test', { id: 1 })
      expect(after).toHaveBeenCalledWith({ id: 1 }, 'test', true)
    })

    it('fires after false result', async () => {
      const gate = new Gate()
      const after = vi.fn()
      gate.after(after)
      gate.define('test', () => false)
      await gate.allows('test', { id: 1 })
      expect(after).toHaveBeenCalledWith({ id: 1 }, 'test', false)
    })
  })

  // ── authorize ────────────────────────────────────────────────

  describe('authorize', () => {
    it('resolves when allowed', async () => {
      const gate = new Gate()
      gate.define('admin', () => true)
      await expect(gate.authorize('admin', { id: 1 })).resolves.toBeUndefined()
    })

    it('throws AuthorizationError when denied', async () => {
      const gate = new Gate()
      gate.define('admin', () => false)
      await expect(gate.authorize('admin', { id: 1 })).rejects.toThrow(AuthorizationError)
    })

    it('throws with correct ability name', async () => {
      const gate = new Gate()
      gate.define('delete-all', () => false)
      try {
        await gate.authorize('delete-all', { id: 1 })
        expect.unreachable('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(AuthorizationError)
        expect((e as AuthorizationError).ability).toBe('delete-all')
      }
    })
  })

  // ── abilitiesFor ─────────────────────────────────────────────

  describe('abilitiesFor', () => {
    it('returns all granted abilities for the user', async () => {
      const gate = new Gate()
      gate.define('a', () => true)
      gate.define('b', () => false)
      gate.define('c', () => true)
      const result = await gate.abilitiesFor({ id: 1 })
      expect(result.sort()).toEqual(['a', 'c'])
    })

    it('returns abilities that pass from policies via dotted ability', async () => {
      const gate = new Gate()
      gate.define('post.view', () => true)
      gate.define('post.edit', () => false)
      gate.define('admin', () => true)
      const result = await gate.abilitiesFor({ id: 1 })
      expect(result).toContain('admin')
      expect(result).toContain('post.view')
      expect(result).not.toContain('post.edit')
    })
  })
})

// ====================================================================
// AUTH MIDDLEWARE
// ====================================================================

describe('auth middleware', () => {
  let authManager: AuthManager

  beforeEach(() => {
    vi.clearAllMocks()
    authManager = new AuthManager()
  })

  function makeContainer() {
    return {
      resolve: vi.fn((name: string) => {
        if (name === 'auth') return authManager
        return undefined
      }),
    } as any
  }

  function makeCtx(overrides: Record<string, unknown> = {}) {
    const ctx = {
      request: makeReqStub(),
      response: makeResStub(),
      container: makeContainer(),
      params: {},
      query: {},
      ...overrides,
    }
    return ctx as any
  }

  describe('authMiddleware (SessionGuard)', () => {
    it('resolves guard from container', async () => {
      const guard = new SessionGuard({ provider: makeUserProvider() })
      authManager.guard('web', guard)
      const ctx = makeCtx()
      const next = vi.fn().mockResolvedValue(undefined)

      await authMiddleware('web')(ctx, next)
      expect(ctx.container.resolve).toHaveBeenCalledWith('auth')
    })

    it('calls next() and sets user on ctx when authenticated', async () => {
      const guard = new SessionGuard()
      const user = { id: 1, name: 'Test' }
      vi.spyOn(guard, 'user').mockResolvedValue(user)
      authManager.guard('web', guard)
      const next = vi.fn().mockResolvedValue(undefined)
      const ctx = makeCtx()

      await authMiddleware('web')(ctx, next)
      expect((ctx as any).user).toEqual(user)
      expect(next).toHaveBeenCalled()
    })

    it('returns unauthorized JSON when not authenticated', async () => {
      const guard = new SessionGuard()
      authManager.guard('web', guard)
      const ctx = makeCtx()
      const next = vi.fn().mockResolvedValue(undefined)

      await authMiddleware('web')(ctx, next)
      expect(ctx.response.status).toHaveBeenCalledWith(401)
      expect(ctx.response.json).toHaveBeenCalledWith({
        error: 'Unauthenticated',
        message: expect.any(String),
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('authMiddleware (TokenGuard)', () => {
    it('extracts bearer token and resolves user', async () => {
      const provider = makeTokenProvider({
        find: vi.fn().mockResolvedValue({ userId: 1, abilities: [] }),
      })
      const lookup = makeUserLookup({ findById: vi.fn().mockResolvedValue({ id: 1, name: 'TokenUser' }) })
      const guard = new TokenGuard({ provider, userLookup: lookup })
      authManager.guard('api', guard)

      const ctx = makeCtx({
        request: makeReqStub({ bearerToken: vi.fn(() => 'valid-token'), wantsJson: vi.fn(() => true) }),
      })
      const next = vi.fn().mockResolvedValue(undefined)

      await authMiddleware('api')(ctx, next)
      expect((ctx as any).user).toEqual({ id: 1, name: 'TokenUser' })
      expect((ctx as any).auth).toBe(guard)
      expect(next).toHaveBeenCalled()
    })

    it('returns unauthorized when bearer token is missing', async () => {
      const guard = new TokenGuard()
      authManager.guard('api', guard)
      const ctx = makeCtx()
      const next = vi.fn()

      await authMiddleware('api')(ctx, next)
      expect(ctx.response.status).toHaveBeenCalledWith(401)
    })
  })

  describe('guestMiddleware', () => {
    it('proceeds to next when user is guest', async () => {
      const guard = new SessionGuard()
      authManager.guard('web', guard)
      const ctx = makeCtx()
      const next = vi.fn().mockResolvedValue(undefined)

      await guestMiddleware()(ctx, next)
      expect(next).toHaveBeenCalled()
    })

    it('returns forbidden when user is authenticated', async () => {
      const guard = new SessionGuard()
      vi.spyOn(guard, 'user').mockResolvedValue({ id: 1 })
      authManager.guard('web', guard)
      const ctx = makeCtx()
      const next = vi.fn()

      await guestMiddleware()(ctx, next)
      expect(ctx.response.status).toHaveBeenCalledWith(403)
      expect(ctx.response.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: expect.any(String),
      })
      expect(next).not.toHaveBeenCalled()
    })
  })

  describe('error handling edge cases', () => {
    it('sets ctx.user to null when unauthenticated', async () => {
      const guard = new SessionGuard()
      authManager.guard('web', guard)
      const ctx = makeCtx()
      await authMiddleware('web')(ctx, vi.fn())
      expect((ctx as any).user).toBeNull()
    })
  })
})

// ====================================================================
// AUTH MANAGER
// ====================================================================

describe('AuthManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers and retrieves a guard', () => {
    const manager = new AuthManager()
    const guard = new SessionGuard()
    manager.guard('web', guard)
    expect(manager.guard('web')).toBe(guard)
  })

  it('retrieves default guard when no name given', () => {
    const manager = new AuthManager()
    const guard = new SessionGuard()
    manager.guard('web', guard)
    expect(manager.guard()).toBe(guard)
  })

  it('throws when guard is not registered', () => {
    const manager = new AuthManager()
    expect(() => manager.guard('missing')).toThrow('not registered')
  })

  it('changes default guard name', () => {
    const manager = new AuthManager()
    const api = new TokenGuard()
    manager.defaultGuard('api')
    manager.guard('api', api)
    expect(manager.guard()).toBe(api)
  })

  it('manages login path', () => {
    const manager = new AuthManager()
    expect(manager.getLoginPath()).toBe('/login')
    manager.setLoginPath('/admin/login')
    expect(manager.getLoginPath()).toBe('/admin/login')
    manager.setLoginPath(undefined)
    expect(manager.getLoginPath()).toBeUndefined()
  })

  it('detects registered guards', () => {
    const manager = new AuthManager()
    expect(manager.hasGuard('web')).toBe(false)
    manager.guard('web', new SessionGuard())
    expect(manager.hasGuard('web')).toBe(true)
  })

  it('removes a guard', () => {
    const manager = new AuthManager()
    manager.guard('web', new SessionGuard())
    manager.removeGuard('web')
    expect(manager.hasGuard('web')).toBe(false)
  })

  it('lists guard names', () => {
    const manager = new AuthManager()
    manager.guard('web', new SessionGuard())
    manager.guard('api', new TokenGuard())
    expect(manager.getGuardNames()).toEqual(['web', 'api'])
  })
})
