import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync, mkdirSync, existsSync, readFileSync } from 'node:fs'

const { PluginManager } = await import('../src/server/plugin/index.js')
const { PluginRegistry } = await import('../src/server/plugin/registry.js')

describe('PluginManager', () => {
  let manager: PluginManager
  let mockApp: any

  beforeEach(() => {
    mockApp = { name: 'test-app' }
    manager = new PluginManager(mockApp as any)
  })

  describe('register', () => {
    it('registers a plugin and calls its register function', async () => {
      const register = vi.fn()
      const plugin = { name: 'my-plugin', register }
      await manager.register(plugin)
      expect(register).toHaveBeenCalledWith(mockApp)
    })

    it('throws when registering duplicate plugin', async () => {
      await manager.register({ name: 'dup', register: vi.fn() })
      await expect(manager.register({ name: 'dup', register: vi.fn() })).rejects.toThrow('already registered')
    })
  })

  describe('bootAll', () => {
    it('calls boot on all registered plugins', async () => {
      const boot1 = vi.fn()
      const boot2 = vi.fn()
      await manager.register({ name: 'p1', register: vi.fn(), boot: boot1 })
      await manager.register({ name: 'p2', register: vi.fn(), boot: boot2 })
      await manager.bootAll()
      expect(boot1).toHaveBeenCalled()
      expect(boot2).toHaveBeenCalled()
    })

    it('does not throw when plugin has no boot method', async () => {
      await manager.register({ name: 'no-boot', register: vi.fn() })
      await expect(manager.bootAll()).resolves.toBeUndefined()
    })
  })

  describe('shutdownAll', () => {
    it('calls shutdown on all registered plugins', async () => {
      const shutdown = vi.fn()
      await manager.register({ name: 'p', register: vi.fn(), shutdown })
      await manager.shutdownAll()
      expect(shutdown).toHaveBeenCalled()
    })

    it('does not throw when plugin has no shutdown method', async () => {
      await manager.register({ name: 'no-shutdown', register: vi.fn() })
      await expect(manager.shutdownAll()).resolves.toBeUndefined()
    })
  })

  describe('get', () => {
    it('returns plugin by name', async () => {
      const plugin = { name: 'my-plugin', register: vi.fn() }
      await manager.register(plugin)
      expect(manager.get('my-plugin')).toBe(plugin)
    })

    it('returns undefined for unknown plugin', () => {
      expect(manager.get('missing')).toBeUndefined()
    })
  })
})

describe('PluginRegistry', () => {
  let tmpDir: string
  let registry: PluginRegistry

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-plugins-'))
    registry = new PluginRegistry(tmpDir)
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {}
  })

  describe('list', () => {
    it('returns empty list when no plugins', () => {
      expect(registry.list()).toEqual([])
    })

    it('returns plugins found via scanLocal', () => {
      const pluginDir = join(tmpDir, 'my-plugin')
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(
        join(pluginDir, 'speexjs-plugin.json'),
        JSON.stringify({
          name: 'my-plugin',
          version: '1.0.0',
          description: 'Test plugin',
          entry: 'index.js',
        }),
        'utf-8',
      )
      writeFileSync(join(pluginDir, 'index.js'), 'module.exports = { register: () => {} }', 'utf-8')
      const list = registry.list()
      expect(list).toHaveLength(1)
      expect(list[0].manifest.name).toBe('my-plugin')
    })

    it('scans local directory and returns all plugins', () => {
      const p1 = join(tmpDir, 'plugin-a')
      const p2 = join(tmpDir, 'plugin-b')
      mkdirSync(p1, { recursive: true })
      mkdirSync(p2, { recursive: true })
      writeFileSync(
        join(p1, 'speexjs-plugin.json'),
        JSON.stringify({ name: 'plugin-a', version: '1.0.0', description: '', entry: 'index.js' }),
        'utf-8',
      )
      writeFileSync(join(p1, 'index.js'), '', 'utf-8')
      writeFileSync(
        join(p2, 'speexjs-plugin.json'),
        JSON.stringify({ name: 'plugin-b', version: '2.0.0', description: '', entry: 'index.js' }),
        'utf-8',
      )
      writeFileSync(join(p2, 'index.js'), '', 'utf-8')
      const list = registry.list()
      expect(list).toHaveLength(2)
    })

    it('skips directories without manifest', () => {
      const d = join(tmpDir, 'not-a-plugin')
      mkdirSync(d, { recursive: true })
      expect(registry.list()).toEqual([])
    })
  })

  describe('install', () => {
    it('installs a local plugin scaffold', async () => {
      const plugin = await registry.install('test-plugin')
      expect(plugin.manifest.name).toBe('test-plugin')
      expect(existsSync(join(tmpDir, 'test-plugin', 'speexjs-plugin.json'))).toBe(true)
      expect(existsSync(join(tmpDir, 'test-plugin', 'index.js'))).toBe(true)
    })

    it('creates plugin with correct manifest structure', async () => {
      const plugin = await registry.install('hello-world')
      expect(plugin.manifest.version).toBe('0.1.0')
      expect(plugin.manifest.entry).toBe('index.js')
      expect(plugin.manifest.hooks).toEqual([])
    })

    it('generates a stub index.js with register/boot/shutdown', async () => {
      await registry.install('stub-plugin')
      const content = readFileSync(join(tmpDir, 'stub-plugin', 'index.js'), 'utf-8')
      expect(content).toContain('register')
      expect(content).toContain('boot')
      expect(content).toContain('shutdown')
    })

    it('throws when plugin already exists', async () => {
      await registry.install('existing')
      await expect(registry.install('existing')).rejects.toThrow('already installed')
    })

    it('records installed plugin in list', async () => {
      await registry.install('listed')
      const list = registry.list()
      expect(list.some((p) => p.manifest.name === 'listed')).toBe(true)
    })
  })

  describe('remove', () => {
    it('removes plugin from registry', async () => {
      await registry.install('temp')
      expect(registry.remove('temp')).toBe(true)
    })

    it('returns false for missing plugin', () => {
      expect(registry.remove('missing')).toBe(false)
    })
  })

  describe('getPluginDir', () => {
    it('returns the configured plugin directory', () => {
      expect(registry.getPluginDir()).toBe(tmpDir)
    })
  })
})
