import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync, mkdirSync } from 'node:fs'

const { Config } = await import('../src/server/config/index.js')
const { defineConfig, loadConfig } = await import('../src/server/config/manager.js')

describe('Config', () => {
  describe('constructor', () => {
    it('creates empty config', () => {
      const c = new Config()
      expect(c).toBeInstanceOf(Config)
    })

    it('creates config with initial values', () => {
      const c = new Config({ port: 3000, host: 'localhost' })
      expect(c.get('port')).toBe(3000)
      expect(c.get('host')).toBe('localhost')
    })
  })

  describe('set / get', () => {
    it('set returns self for chaining', () => {
      const c = new Config()
      expect(c.set('key', 'val')).toBe(c)
    })

    it('get retrieves stored value', () => {
      const c = new Config()
      c.set('db.host', 'pg.example.com')
      expect(c.get('db.host')).toBe('pg.example.com')
    })

    it('get returns default when key missing', () => {
      const c = new Config()
      expect(c.get('missing.key', 42)).toBe(42)
    })

    it('get returns undefined for missing key without default', () => {
      const c = new Config()
      expect(c.get('nope')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true for existing key', () => {
      const c = new Config()
      c.set('exists', 1)
      expect(c.has('exists')).toBe(true)
    })

    it('returns false for missing key', () => {
      const c = new Config()
      expect(c.has('ghost')).toBe(false)
    })
  })

  describe('fromEnv', () => {
    beforeEach(() => {
      process.env.APP_PORT = '8080'
      process.env.APP_DEBUG = 'true'
      process.env.APP_DB_HOST = 'localhost'
      process.env.APP_NULL_VAL = 'null'
      process.env.OTHER_VAR = 'ignored'
    })

    afterEach(() => {
      delete process.env.APP_PORT
      delete process.env.APP_DEBUG
      delete process.env.APP_DB_HOST
      delete process.env.APP_NULL_VAL
      delete process.env.OTHER_VAR
    })

    it('loads env vars with prefix', () => {
      const c = Config.fromEnv('APP_')
      expect(c.get('port')).toBe(8080)
      expect(c.get('debug')).toBe(true)
    })

    it('uses default prefix APP_', () => {
      const c = Config.fromEnv()
      expect(c.get('port')).toBe(8080)
    })

    it('parses boolean values', () => {
      const c = Config.fromEnv('APP_')
      expect(c.get('debug')).toBe(true)
    })

    it('parses numeric values', () => {
      const c = Config.fromEnv('APP_')
      expect(c.get('port')).toBe(8080)
    })

    it('parses null string to null', () => {
      const c = Config.fromEnv('APP_')
      expect(c.get('null_val')).toBeNull()
    })

    it('ignores non-matching prefix', () => {
      const c = Config.fromEnv('APP_')
      expect(c.get('other_var')).toBeUndefined()
    })
  })
})

describe('defineConfig', () => {
  it('returns the config object as-is', () => {
    const cfg = {
      app: { name: 'Test', port: 4000, host: '0.0.0.0', env: 'development' as const, debug: true },
      database: { default: 'sqlite', connections: {} },
      auth: { defaults: { guard: 'session' }, guards: {} },
      server: {
        cors: { origin: '*', credentials: true },
        session: { driver: 'cookie' as const, ttl: 120 },
        rateLimit: { max: 60, window: 60 },
      },
      paths: {
        root: '/app',
        src: '/app/src',
        routes: '/app/routes',
        views: '/app/views',
        migrations: '/app/migrations',
        public: '/app/public',
      },
    }
    expect(defineConfig(cfg)).toBe(cfg)
  })

  it('provides type safety via SpeexConfig', () => {
    const cfg = defineConfig({
      app: { name: 'MyApp', port: 3000, host: 'localhost', env: 'production', debug: false },
      database: {
        default: 'postgresql',
        connections: { primary: { driver: 'postgresql', host: 'db.local', database: 'app', username: 'user', password: 'pass' } },
      },
      auth: { defaults: { guard: 'jwt' }, guards: { jwt: { driver: 'token' } } },
      server: {
        cors: { origin: ['https://app.com'], credentials: true },
        session: { driver: 'redis', ttl: 3600 },
        rateLimit: { max: 100, window: 60 },
      },
      paths: { root: '/var/www', src: 'src', routes: 'routes', views: 'views', migrations: 'migrations', public: 'public' },
    })
    expect(cfg.app.name).toBe('MyApp')
    expect(cfg.app.env).toBe('production')
  })
})

describe('loadConfig', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-config-'))
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {}
  })

  it('returns defaults when no config file exists', async () => {
    const cfg = await loadConfig(tmpDir)
    expect(cfg.app.name).toBe('SpeexJS')
    expect(cfg.app.port).toBe(3000)
    expect(cfg.app.env).toBe('development')
    expect(cfg.database.default).toBe('sqlite')
    expect(cfg.server.cors.origin).toBe('*')
  })

  it('loads from speexjs.config.ts', async () => {
    const content = `
export default {
  app: { name: 'CustomApp', port: 8080, host: '0.0.0.0', env: 'production', debug: false },
  database: { default: 'postgresql', connections: {} },
  auth: { defaults: { guard: 'session' }, guards: {} },
  server: { cors: { origin: '*', credentials: true }, session: { driver: 'cookie', ttl: 120 }, rateLimit: { max: 60, window: 60 } },
  paths: { root: '/app', src: '/app/src', routes: '/app/routes', views: '/app/views', migrations: '/app/migrations', public: '/app/public' },
}`
    writeFileSync(join(tmpDir, 'speexjs.config.ts'), content, 'utf-8')
    const cfg = await loadConfig(tmpDir)
    expect(cfg.app.name).toBe('CustomApp')
    expect(cfg.app.port).toBe(8080)
    expect(cfg.app.env).toBe('production')
  })

  it('loads from speexjs.config.js', async () => {
    const content = `
module.exports = {
  app: { name: 'JsApp', port: 4000, host: '0.0.0.0', env: 'development', debug: true },
  database: { default: 'mysql', connections: {} },
  auth: { defaults: { guard: 'session' }, guards: {} },
  server: { cors: { origin: '*', credentials: true }, session: { driver: 'cookie', ttl: 120 }, rateLimit: { max: 60, window: 60 } },
  paths: { root: '/app', src: '/app/src', routes: '/app/routes', views: '/app/views', migrations: '/app/migrations', public: '/app/public' },
}`
    writeFileSync(join(tmpDir, 'speexjs.config.js'), content, 'utf-8')
    const cfg = await loadConfig(tmpDir)
    expect(cfg.app.name).toBe('JsApp')
    expect(cfg.database.default).toBe('mysql')
  })

  it('loads from speexjs.json', async () => {
    const content = JSON.stringify({
      app: { name: 'JsonApp', port: 5000, host: '0.0.0.0', env: 'testing', debug: false },
    })
    writeFileSync(join(tmpDir, 'speexjs.json'), content, 'utf-8')
    const cfg = await loadConfig(tmpDir)
    expect(cfg.app.name).toBe('JsonApp')
    expect(cfg.app.port).toBe(5000)
    expect(cfg.app.env).toBe('testing')
  })

  it('deep merges user config with defaults', async () => {
    const content = JSON.stringify({
      app: { name: 'MergedApp' },
      database: { connections: { secondary: { driver: 'sqlite', database: 'test.db' } } },
    })
    writeFileSync(join(tmpDir, 'speexjs.json'), content, 'utf-8')
    const cfg = await loadConfig(tmpDir)
    expect(cfg.app.name).toBe('MergedApp')
    expect(cfg.app.port).toBe(3000)
    expect(cfg.database.default).toBe('sqlite')
    expect(cfg.database.connections.secondary.database).toBe('test.db')
  })

  it('resolves relative paths', async () => {
    const content = JSON.stringify({
      paths: {
        root: tmpDir,
        src: 'custom-src',
        routes: 'custom-routes',
        views: 'custom-views',
        migrations: 'custom-migrations',
        public: 'custom-public',
      },
    })
    writeFileSync(join(tmpDir, 'speexjs.json'), content, 'utf-8')
    const cfg = await loadConfig(tmpDir)
    expect(cfg.paths.src).toContain('custom-src')
    expect(cfg.paths.routes).toContain('custom-routes')
  })
})

describe('env', () => {
  let envMod: typeof import('../src/server/env/index.js')

  beforeAll(async () => {
    envMod = await import('../src/server/env/index.js')
  })

  beforeEach(() => {
    process.env.TEST_STRING = 'hello'
    process.env.TEST_INT = '42'
    process.env.TEST_BOOL_TRUE = 'true'
    process.env.TEST_BOOL_1 = '1'
    process.env.TEST_BOOL_YES = 'yes'
    process.env.TEST_BOOL_FALSE = 'false'
    process.env.TEST_ARRAY = 'a,b,c'
    process.env.TEST_ARRAY_SPACES = ' x , y , z '
  })

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('TEST_')) delete process.env[key]
    }
  })

  describe('env() base', () => {
    it('reads string value from process.env', () => {
      expect(envMod.env('TEST_STRING')).toBe('hello')
    })

    it('returns default when var missing', () => {
      expect(envMod.env('MISSING_VAR', 'default')).toBe('default')
    })

    it('throws when var missing and no default', () => {
      expect(() => envMod.env('DEFINITELY_MISSING')).toThrow('not set')
    })
  })

  describe('env.int', () => {
    it('parses integer', () => {
      expect(envMod.env.int('TEST_INT')).toBe(42)
    })

    it('returns default when missing', () => {
      expect(envMod.env.int('MISSING_INT', 99)).toBe(99)
    })

    it('floors float values', () => {
      process.env.TEST_FLOAT = '3.14'
      expect(envMod.env.int('TEST_FLOAT')).toBe(3)
      delete process.env.TEST_FLOAT
    })

    it('throws for NaN', () => {
      expect(() => envMod.env.int('TEST_STRING')).toThrow('cannot be parsed as integer')
    })
  })

  describe('env.bool', () => {
    it('returns true for "true"', () => {
      expect(envMod.env.bool('TEST_BOOL_TRUE')).toBe(true)
    })

    it('returns true for "1"', () => {
      expect(envMod.env.bool('TEST_BOOL_1')).toBe(true)
    })

    it('returns true for "yes"', () => {
      expect(envMod.env.bool('TEST_BOOL_YES')).toBe(true)
    })

    it('returns false for "false"', () => {
      expect(envMod.env.bool('TEST_BOOL_FALSE')).toBe(false)
    })

    it('returns default when missing', () => {
      expect(envMod.env.bool('MISSING_BOOL', true)).toBe(true)
    })
  })

  describe('env.array', () => {
    it('parses comma-separated values', () => {
      expect(envMod.env.array('TEST_ARRAY')).toEqual(['a', 'b', 'c'])
    })

    it('trims whitespace around items', () => {
      expect(envMod.env.array('TEST_ARRAY_SPACES')).toEqual(['x', 'y', 'z'])
    })

    it('returns default when missing', () => {
      expect(envMod.env.array('MISSING_ARRAY', ['default'])).toEqual(['default'])
    })

    it('filters empty strings', () => {
      process.env.TEST_EMPTY = 'a,,b,'
      expect(envMod.env.array('TEST_EMPTY')).toEqual(['a', 'b'])
      delete process.env.TEST_EMPTY
    })
  })

  describe('requireEnv', () => {
    it('does not throw when all vars present', () => {
      process.env.REQ_A = 'a'
      process.env.REQ_B = 'b'
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      envMod.requireEnv('REQ_A', 'REQ_B')
      expect(exitSpy).not.toHaveBeenCalled()
      exitSpy.mockRestore()
      delete process.env.REQ_A
      delete process.env.REQ_B
    })

    it('exits when a var is missing', () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      envMod.requireEnv('MISSING_REQ_A', 'MISSING_REQ_B')
      expect(consoleSpy).toHaveBeenCalled()
      expect(exitSpy).toHaveBeenCalledWith(1)
      exitSpy.mockRestore()
      consoleSpy.mockRestore()
    })
  })
})
