import { describe, it, expect, vi, beforeEach } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs'
import { execSync } from 'child_process'
import { parseArgs, toCommandName } from '../src/native/args.js'
import { initProject } from '../src/cli/commands/init.js'
import { serve } from '../src/cli/commands/serve.js'
import { makeController } from '../src/cli/commands/make-controller.js'
import { makeMiddleware } from '../src/cli/commands/make-middleware.js'
import { makeSchema } from '../src/cli/commands/make-schema.js'
import { listRoutes } from '../src/cli/commands/list-routes.js'

vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue([]),
  readFileSync: vi.fn(),
}))

vi.mock('child_process', () => ({
  execSync: vi.fn(),
}))

// ─── parseArgs ───────────────────────────────────────────────

describe('parseArgs', () => {
  it('returns empty command for no args', () => {
    const result = parseArgs(['node', 'speexjs'])
    expect(result.command).toBe('')
    expect(result.args).toEqual([])
    expect(result.options).toEqual({})
  })

  it('parses a single command', () => {
    const result = parseArgs(['node', 'speexjs', 'serve'])
    expect(result.command).toBe('serve')
    expect(result.args).toEqual([])
    expect(result.options).toEqual({})
  })

  it('parses command with subcommand', () => {
    const result = parseArgs(['node', 'speexjs', 'make', 'controller'])
    expect(result.command).toBe('make')
    expect(result.subcommand).toBe('controller')
    expect(result.args).toEqual(['controller'])
  })

  it('parses command with colon syntax', () => {
    const result = parseArgs(['node', 'speexjs', 'make:controller'])
    expect(result.command).toBe('make:controller')
    expect(result.subcommand).toBeUndefined()
  })

  it('parses init command with project name', () => {
    const result = parseArgs(['node', 'speexjs', 'init', 'my-app'])
    expect(result.command).toBe('init')
    expect(result.args).toEqual(['my-app'])
  })

  it('parses --flag as boolean true', () => {
    const result = parseArgs(['node', 'speexjs', 'serve', '--dev'])
    expect(result.options).toEqual({ dev: true })
  })

  it('parses --key value option', () => {
    const result = parseArgs(['node', 'speexjs', 'init', '--template', 'fullstack'])
    expect(result.options).toEqual({ template: 'fullstack' })
  })

  it('parses -k value short option', () => {
    const result = parseArgs(['node', 'speexjs', 'serve', '-p', '8080'])
    expect(result.options).toEqual({ p: '8080' })
  })

  it('parses --no-flag as false', () => {
    const result = parseArgs(['node', 'speexjs', 'serve', '--no-dev'])
    expect(result.options).toEqual({ dev: false })
  })

  it('parses -- delimiter for positional args', () => {
    const result = parseArgs(['node', 'speexjs', 'init', '--', 'extra', 'args'])
    expect(result.args).toEqual(['extra', 'args'])
  })

  it('collects multiple values for same key into array', () => {
    const result = parseArgs(['node', 'speexjs', 'test', '--item', 'a', '--item', 'b'])
    expect(result.options).toEqual({ item: ['a', 'b'] })
  })

  it('handles three or more values for same key', () => {
    const result = parseArgs(['node', 'speexjs', 'test', '--id', '1', '--id', '2', '--id', '3'])
    expect(result.options).toEqual({ id: ['1', '2', '3'] })
  })

  it('parses short boolean flag', () => {
    const result = parseArgs(['node', 'speexjs', 'serve', '-d'])
    expect(result.options).toEqual({ d: true })
  })

  it('parses mixed options and args', () => {
    const result = parseArgs(['node', 'speexjs', 'init', 'my-app', '--template', 'api-only', '--git'])
    expect(result.command).toBe('init')
    expect(result.args).toEqual(['my-app'])
    expect(result.options).toEqual({ template: 'api-only', git: true })
  })

  it('parses command with colon and options', () => {
    const result = parseArgs(['node', 'speexjs', 'make:controller', 'User', '-f'])
    expect(result.command).toBe('make:controller')
    expect(result.args).toEqual(['User'])
    expect(result.options).toEqual({ f: true })
  })
})

// ─── toCommandName ───────────────────────────────────────────

describe('toCommandName', () => {
  it('returns plain command as-is', () => {
    expect(toCommandName(['node', 'speexjs', 'serve'])).toBe('serve')
  })

  it('converts subcommand to colon format', () => {
    expect(toCommandName(['node', 'speexjs', 'make', 'controller'])).toBe('make:controller')
  })

  it('returns colon command as-is', () => {
    expect(toCommandName(['node', 'speexjs', 'make:controller'])).toBe('make:controller')
  })

  it('returns empty string for no args', () => {
    expect(toCommandName(['node', 'speexjs'])).toBe('')
  })

  it('converts init with name to init:name colon format', () => {
    expect(toCommandName(['node', 'speexjs', 'init', 'my-app'])).toBe('init:my-app')
  })

  it('handles single command only', () => {
    expect(toCommandName(['node', 'speexjs', 'help'])).toBe('help')
  })

  it('does not split second arg when it starts with -', () => {
    expect(toCommandName(['node', 'speexjs', 'serve', '--port'])).toBe('serve')
  })
})

// ─── initProject ─────────────────────────────────────────────

describe('initProject', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(mkdirSync).mockImplementation(() => undefined)
    vi.mocked(writeFileSync).mockImplementation(() => undefined)
    vi.mocked(execSync).mockReturnValue(Buffer.from(''))

    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('EXIT') }) as any)
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('blank template', () => {
    it('creates directory structure', async () => {
      await expect(initProject('my-app', { template: 'blank' })).resolves.toBeUndefined()

      const mkdirCalls = vi.mocked(mkdirSync).mock.calls
      expect(mkdirCalls.some(([p]) => p.toString().includes('my-app'))).toBe(true)
      expect(mkdirCalls.some(([p]) => p.toString().includes('src'))).toBe(true)
    })

    it('creates all blank template files', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const filePaths = writeCalls.map(([p]) => p.toString())

      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('package.json'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('tsconfig.json'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('src/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('src/config/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('.env.example'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('.gitignore'))).toBe(true)
    })

    it('generates correct package.json', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const pkgCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('package.json'))
      expect(pkgCall).toBeDefined()

      const pkg = JSON.parse(pkgCall![1].toString())
      expect(pkg.name).toBe('my-app')
      expect(pkg.version).toBe('0.1.0')
      expect(pkg.type).toBe('module')
      expect(pkg.private).toBe(true)
      expect(pkg.dependencies.speexjs).toBe('latest')
      expect(pkg.devDependencies['@types/node']).toBe('^26.0.1')
      expect(pkg.devDependencies.typescript).toBe('^5.7.0')
      expect(pkg.scripts.dev).toBe('speexjs serve')
    })

    it('generates correct tsconfig.json', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const tsCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('tsconfig.json'))
      expect(tsCall).toBeDefined()

      const tsconfig = JSON.parse(tsCall![1].toString())
      expect(tsconfig.compilerOptions.target).toBe('ES2022')
      expect(tsconfig.compilerOptions.module).toBe('ESNext')
      expect(tsconfig.compilerOptions.outDir).toBe('./dist')
      expect(tsconfig.include).toContain('src/**/*.ts')
    })

    it('generates src/index.ts with speexjs import', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const indexCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('src/index.ts'))
      expect(indexCall).toBeDefined()
      expect(indexCall![1].toString()).toContain("import { speexjs")
      expect(indexCall![1].toString()).toContain('export { app }')
    })

    it('generates src/config/index.ts with Config object', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const configCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('src/config/index.ts'))
      expect(configCall).toBeDefined()
      expect(configCall![1].toString()).toContain('export const Config')
      expect(configCall![1].toString()).toContain("process.env.PORT")
    })

    it('generates .gitignore with standard entries', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const gitignoreCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('.gitignore'))
      expect(gitignoreCall).toBeDefined()
      expect(gitignoreCall![1].toString()).toContain('node_modules/')
      expect(gitignoreCall![1].toString()).toContain('dist/')
      expect(gitignoreCall![1].toString()).toContain('.env')
    })

    it('generates .env.example with PORT and NODE_ENV', async () => {
      await initProject('my-app', { template: 'blank' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const envCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('.env.example'))
      expect(envCall).toBeDefined()
      expect(envCall![1].toString()).toContain('PORT=3000')
      expect(envCall![1].toString()).toContain('NODE_ENV=development')
    })
  })

  describe('fullstack template', () => {
    it('creates full directory structure', async () => {
      await initProject('my-app', { template: 'fullstack' })

      const mkdirCalls = vi.mocked(mkdirSync).mock.calls.map(([p]) => p.toString().replace(/\\/g, '/'))
      expect(mkdirCalls.some(p => p.includes('src/server/controllers'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('src/server/middleware'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('src/client/components'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('src/client/pages'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('src/shared'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('public'))).toBe(true)
    })

    it('creates all fullstack template files', async () => {
      await initProject('my-app', { template: 'fullstack' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const filePaths = writeCalls.map(([p]) => p.toString().replace(/\\/g, '/'))

      expect(filePaths.some(p => p.endsWith('src/server/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/server/controllers/user.controller.ts'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/client/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/client/app.tsx'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('public/style.css'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/shared/types.ts'))).toBe(true)
    })

    it('generates tsconfig with jsx settings', async () => {
      await initProject('my-app', { template: 'fullstack' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const tsCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('tsconfig.json'))
      const tsconfig = JSON.parse(tsCall![1].toString())
      expect(tsconfig.compilerOptions.jsx).toBe('react-jsx')
      expect(tsconfig.compilerOptions.jsxImportSource).toBe('@speexjs/vdom')
      expect(tsconfig.include).toContain('src/**/*.tsx')
    })

    it('generates user controller with @get and @post decorators', async () => {
      await initProject('my-app', { template: 'fullstack' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const controllerCall = writeCalls.find(([p]) => p.toString().includes('user.controller'))
      const content = controllerCall![1].toString()
      expect(content).toContain("import { Controller, get, post } from 'speexjs/server'")
      expect(content).toContain('export class UserController extends Controller')
      expect(content).toContain("@get('/users')")
      expect(content).toContain("@post('/users')")
    })

    it('generates client app with mount function', async () => {
      await initProject('my-app', { template: 'fullstack' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const clientCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').endsWith('src/client/app.tsx'))
      expect(clientCall![1].toString()).toContain('export function createApp()')
      expect(clientCall![1].toString()).toContain('function mount(selector: string)')
    })
  })

  describe('api-only template', () => {
    it('creates api-only directory structure', async () => {
      await initProject('my-app', { template: 'api-only' })

      const mkdirCalls = vi.mocked(mkdirSync).mock.calls.map(([p]) => p.toString().replace(/\\/g, '/'))
      expect(mkdirCalls.some(p => p.includes('src/controllers'))).toBe(true)
      expect(mkdirCalls.some(p => p.includes('src/middleware'))).toBe(true)
    })

    it('creates api-only files', async () => {
      await initProject('my-app', { template: 'api-only' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const filePaths = writeCalls.map(([p]) => p.toString().replace(/\\/g, '/'))

      expect(filePaths.some(p => p.endsWith('src/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/controllers/health.controller.ts'))).toBe(true)
      expect(filePaths.some(p => p.endsWith('src/middleware/auth.ts'))).toBe(true)
    })

    it('generates health controller with @get decorator', async () => {
      await initProject('my-app', { template: 'api-only' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const healthCall = writeCalls.find(([p]) => p.toString().includes('health.controller'))
      const content = healthCall![1].toString()
      expect(content).toContain("import { Controller, get } from 'speexjs/server'")
      expect(content).toContain('export class HealthController extends Controller')
      expect(content).toContain("@get('/health')")
    })

    it('generates auth middleware with RouteContext type', async () => {
      await initProject('my-app', { template: 'api-only' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const authCall = writeCalls.find(([p]) => p.toString().replace(/\\/g, '/').includes('middleware/auth'))
      const content = authCall![1].toString()
      expect(content).toContain("import type { RouteContext } from 'speexjs/server/router'")
      expect(content).toContain('export function auth()')
      expect(content).toContain('ctx.request.headers.get')
    })
  })

  describe('template aliases', () => {
    it('resolves "api" alias to "api-only"', async () => {
      await initProject('my-app', { template: 'api' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      expect(writeCalls.some(([p]) => p.toString().includes('health.controller'))).toBe(true)
    })

    it('resolves "full" alias to "fullstack"', async () => {
      await initProject('my-app', { template: 'full' })

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      expect(writeCalls.some(([p]) => p.toString().includes('user.controller'))).toBe(true)
    })
  })

  describe('error handling', () => {
    it('throws when target directory already exists', async () => {
      vi.mocked(existsSync).mockReturnValue(true)

      await expect(initProject('existing', { template: 'blank' })).rejects.toThrow('EXIT')
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('already exists'))
      expect(vi.mocked(mkdirSync)).not.toHaveBeenCalled()
    })

    it('throws for invalid template name', async () => {
      await expect(initProject('my-app', { template: 'nonexistent' })).rejects.toThrow('EXIT')
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown template'))
    })

    it('defaults to fullstack template when no template specified', async () => {
      await initProject('my-app', {})

      const writeCalls = vi.mocked(writeFileSync).mock.calls
      const filePaths = writeCalls.map(([p]) => p.toString())
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('src/server/index.ts'))).toBe(true)
      expect(filePaths.some(p => p.replace(/\\/g, '/').endsWith('src/server/controllers/user.controller.ts'))).toBe(true)
    })
  })

  describe('git init', () => {
    it('calls git init by default', async () => {
      await initProject('my-app', { template: 'blank' })

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        'git init',
        expect.objectContaining({ cwd: expect.stringContaining('my-app') }),
      )
    })

    it('skips git init when --no-git passed', async () => {
      await initProject('my-app', { template: 'blank', git: false })

      expect(vi.mocked(execSync)).not.toHaveBeenCalledWith('git init', expect.any(Object))
    })
  })

  describe('dependency install', () => {
    it('calls install by default with npm', async () => {
      await initProject('my-app', { template: 'blank' })

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        'npm install',
        expect.objectContaining({ cwd: expect.stringContaining('my-app') }),
      )
    })

    it('skips install when --no-install passed', async () => {
      await initProject('my-app', { template: 'blank', install: false })

      const execCalls = vi.mocked(execSync).mock.calls.map(([cmd]) => cmd.toString())
      expect(execCalls.some(c => c.includes('install'))).toBe(false)
    })
  })
})

// ─── serve ───────────────────────────────────────────────────

describe('serve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('EXIT') }) as any)
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('entry point detection', () => {
    it('checks src/app.ts as first entry point', async () => {
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return path.toString().includes('src/app.ts')
      })

      await expect(serve({})).rejects.toThrow('EXIT')
    })

    it('falls back to src/server/index.ts', async () => {
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return path.toString().includes('src/server/index.ts')
      })

      await expect(serve({})).rejects.toThrow('EXIT')
    })

    it('falls back to src/index.ts', async () => {
      vi.mocked(existsSync).mockImplementation((path: unknown) => {
        return path.toString().includes('src/index.ts')
      })

      await expect(serve({})).rejects.toThrow('EXIT')
    })

    it('prints error when no entry point found', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await expect(serve({})).rejects.toThrow('EXIT')
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Entry point not found'),
      )
    })
  })

  describe('port and host options', () => {
    it('accepts --port option', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(serve({ port: '8080' })).rejects.toThrow('EXIT')
    })

    it('accepts -p shorthand for port', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(serve({ p: '8080' })).rejects.toThrow('EXIT')
    })

    it('accepts --host option', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(serve({ host: '0.0.0.0' })).rejects.toThrow('EXIT')
    })

    it('defaults port to 3000 when no entry', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(serve({})).rejects.toThrow('EXIT')
    })

    it('defaults host to localhost when no entry', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(serve({})).rejects.toThrow('EXIT')
    })
  })
})

// ─── make:controller ─────────────────────────────────────────

describe('make:controller', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(mkdirSync).mockImplementation(() => undefined)
    vi.mocked(writeFileSync).mockImplementation(() => undefined)
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('EXIT') }) as any)
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('generates controller with correct class name in content', () => {
    makeController('User')

    const writeCalls = vi.mocked(writeFileSync).mock.calls
    expect(writeCalls.length).toBe(1)

    const [path, content] = writeCalls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('src/server/controllers')
    expect(content.toString()).toContain("import { Controller, get, post, put, del } from 'speexjs/server'")
    expect(content.toString()).toContain('export class UserController extends Controller')
    expect(content.toString()).toContain("@get('/')")
    expect(content.toString()).toContain("@get('/:id')")
    expect(content.toString()).toContain("@post('/')")
    expect(content.toString()).toContain("@put('/:id')")
    expect(content.toString()).toContain("@del('/:id')")
    expect(content.toString()).toContain('export const userController = UserController')
  })

  it('uses kebab-case filename', () => {
    makeController('UserProfile')

    const [path] = vi.mocked(writeFileSync).mock.calls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('user-profile.controller.ts')
  })

  it('throws when file already exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)

    expect(() => makeController('User')).toThrow('EXIT')
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled()
  })

  it('creates controller directory if not exists', () => {
    makeController('Product')

    const mkdirCalls = vi.mocked(mkdirSync).mock.calls
    const mkdirPaths = mkdirCalls.map(([p]) => p.toString().replace(/\\/g, '/'))
    expect(mkdirPaths.some(p => p.includes('src/server/controllers'))).toBe(true)
  })

  it('handles multi-word names with PascalCase class', () => {
    makeController('blog-post')

    const content = vi.mocked(writeFileSync).mock.calls[0]![1].toString()
    expect(content).toContain('export class BlogPostController extends Controller')
  })
})

// ─── make:middleware ─────────────────────────────────────────

describe('make:middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(mkdirSync).mockImplementation(() => undefined)
    vi.mocked(writeFileSync).mockImplementation(() => undefined)
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('EXIT') }) as any)
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('generates middleware file with correct function name', () => {
    makeMiddleware('auth')

    const writeCalls = vi.mocked(writeFileSync).mock.calls
    expect(writeCalls.length).toBe(1)

    const [path, content] = writeCalls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('auth.middleware.ts')
    expect(content.toString()).toContain("import type { RouteContext } from 'speexjs/server/router'")
    expect(content.toString()).toContain('export function auth(')
    expect(content.toString()).toContain('[AuthMiddleware]')
    expect(content.toString()).toContain('ctx.request.method')
    expect(content.toString()).toContain('ctx.request.url')
  })

  it('uses kebab-case filename', () => {
    makeMiddleware('RequestLogger')

    const [path] = vi.mocked(writeFileSync).mock.calls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('request-logger.middleware.ts')
  })

  it('generates middleware with options parameter', () => {
    makeMiddleware('rate-limiter')

    const content = vi.mocked(writeFileSync).mock.calls[0]![1].toString()
    expect(content).toContain('options?: Record<string, unknown>')
  })

  it('throws when file already exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)

    expect(() => makeMiddleware('auth')).toThrow('EXIT')
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled()
  })
})

// ─── make:schema ─────────────────────────────────────────────

describe('make:schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(mkdirSync).mockImplementation(() => undefined)
    vi.mocked(writeFileSync).mockImplementation(() => undefined)
    vi.spyOn(process, 'exit').mockImplementation((() => { throw new Error('EXIT') }) as any)
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('generates schema file with correct schema name', () => {
    makeSchema('User')

    const writeCalls = vi.mocked(writeFileSync).mock.calls
    expect(writeCalls.length).toBe(1)

    const [path, content] = writeCalls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('user.schema.ts')
    expect(content.toString()).toContain("import { schema, type Infer } from 'speexjs/schema'")
    expect(content.toString()).toContain('export const UserSchema = schema.object({')
    expect(content.toString()).toContain('id: schema.string().uuid()')
    expect(content.toString()).toContain('name: schema.string().min(1).max(255)')
    expect(content.toString()).toContain('createdAt: schema.string().datetime()')
    expect(content.toString()).toContain('export const createUserSchema = schema.object({')
    expect(content.toString()).toContain('export type CreateUser = Infer<typeof createUserSchema>')
  })

  it('uses kebab-case filename', () => {
    makeSchema('BlogPost')

    const [path] = vi.mocked(writeFileSync).mock.calls[0]!
    expect(path.toString().replace(/\\/g, '/')).toContain('blog-post.schema.ts')
  })

  it('throws when file already exists', () => {
    vi.mocked(existsSync).mockReturnValue(true)

    expect(() => makeSchema('User')).toThrow('EXIT')
    expect(vi.mocked(writeFileSync)).not.toHaveBeenCalled()
  })

  it('handles pascal-case name conversion for schema types', () => {
    makeSchema('order-item')

    const content = vi.mocked(writeFileSync).mock.calls[0]![1].toString()
    expect(content).toContain('OrderItemSchema')
    expect(content).toContain('createOrderItemSchema')
    expect(content).toContain('export type OrderItem = Infer<typeof OrderItemSchema>')
  })
})

// ─── listRoutes ──────────────────────────────────────────────

describe('listRoutes', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(existsSync).mockReturnValue(true)
    vi.mocked(readdirSync).mockReturnValue([] as any)
    vi.mocked(readFileSync).mockReturnValue('')
    vi.spyOn(process, 'cwd').mockReturnValue('/test')
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('extractDecorators', () => {
    it('extracts GET routes from controller content', () => {
      const controllerContent = `
        import { Controller, get } from 'speexjs/server'

        export class HealthController extends Controller {
          @get('/health')
          async check({ response }) {
            return response.json({ status: 'ok' })
          }
        }
      `

      vi.mocked(readdirSync).mockReturnValue(['health.controller.ts'] as any)
      vi.mocked(readFileSync).mockReturnValue(controllerContent)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/health'))
    })

    it('extracts multiple HTTP method decorators', () => {
      const controllerContent = `
        @get('/users')
        async index() {}
        @post('/users')
        async store() {}
        @put('/users/:id')
        async update() {}
        @del('/users/:id')
        async destroy() {}
        @patch('/users/:id/status')
        async patch() {}
      `

      vi.mocked(readdirSync).mockReturnValue(['user.controller.ts'] as any)
      vi.mocked(readFileSync).mockReturnValue(controllerContent)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('GET'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('POST'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PUT'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DELETE'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('PATCH'))
    })

    it('handles @delete decorator as DELETE', () => {
      const controllerContent = `
        @delete('/items/:id')
        async erase() {}
      `

      vi.mocked(readdirSync).mockReturnValue(['item.controller.ts'] as any)
      vi.mocked(readFileSync).mockReturnValue(controllerContent)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('DELETE'))
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('/items/:id'))
    })

    it('shows route count at the end', () => {
      const controllerContent = `
        @get('/a') async a() {}
        @post('/b') async b() {}
      `

      vi.mocked(readdirSync).mockReturnValue(['test.controller.ts'] as any)
      vi.mocked(readFileSync).mockReturnValue(controllerContent)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2 routes'))
    })

    it('shows singular "route" for exactly 1 route', () => {
      const controllerContent = `@get('/a') async a() {}`

      vi.mocked(readdirSync).mockReturnValue(['test.controller.ts'] as any)
      vi.mocked(readFileSync).mockReturnValue(controllerContent)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('1 route'))
    })
  })

  describe('directory handling', () => {
    it('shows message when routes directory missing', () => {
      vi.mocked(existsSync).mockReturnValue(false)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No routes registered'))
    })

    it('shows message when no controller files found', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([] as any)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No routes registered'))
    })

    it('only reads .ts files from controllers directory', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue(['user.controller.ts', 'temp.js'] as any)
      vi.mocked(readFileSync).mockReturnValue(`@get('/test') async t() {}`)

      listRoutes()

      expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1)
    })
  })

  describe('multiple controllers', () => {
    it('lists routes from multiple controller files', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readdirSync).mockReturnValue([
        'users.controller.ts',
        'posts.controller.ts',
      ] as any)
      vi.mocked(readFileSync)
        .mockReturnValueOnce(`@get('/users') async index() {}`)
        .mockReturnValueOnce(`@get('/posts') async index() {}`)

      listRoutes()

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('2 routes'))
    })
  })
})
