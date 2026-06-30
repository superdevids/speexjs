import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface AuthOptions {
  guard: 'session' | 'token' | 'sanctum'
  views: boolean
  api: boolean
}

function generateUserModel(guard: string): string {
  return `import { Model } from 'speexjs/server/database'

export class User extends Model {
  static table = 'users'

  static hidden = ['password']

  static guard: '${guard}' = '${guard}'

  static casts = {
    email_verified_at: 'datetime',
    created_at: 'datetime',
    updated_at: 'datetime',
  }

  hasMany(related: string, foreignKey: string, localKey: string) {
    return super.hasMany(related, foreignKey, localKey)
  }

  belongsTo(related: string, foreignKey: string, ownerKey: string) {
    return super.belongsTo(related, foreignKey, ownerKey)
  }
}
`
}

function generateUserMigration(): string {
  return `import { SchemaBuilder } from 'speexjs/server/database'

export async function up(schema: SchemaBuilder): Promise<void> {
  schema.createTable('users', (table) => {
    table.increments('id')
    table.string('name').notNullable()
    table.string('email').unique().notNullable()
    table.string('password').notNullable()
    table.timestamp('email_verified_at').nullable()
    table.string('remember_token').nullable()
    table.timestamps()
  })
}

export async function down(schema: SchemaBuilder): Promise<void> {
  schema.dropTable('users')
}
`
}

function generatePasswordResetMigration(): string {
  return `import { SchemaBuilder } from 'speexjs/server/database'

export async function up(schema: SchemaBuilder): Promise<void> {
  schema.createTable('password_resets', (table) => {
    table.string('email').index()
    table.string('token')
    table.timestamp('created_at').nullable()
  })
}

export async function down(schema: SchemaBuilder): Promise<void> {
  schema.dropTable('password_resets')
}
`
}

function generateSessionMigration(): string {
  return `import { SchemaBuilder } from 'speexjs/server/database'

export async function up(schema: SchemaBuilder): Promise<void> {
  schema.createTable('sessions', (table) => {
    table.string('id').primary()
    table.integer('user_id').nullable().index()
    table.string('ip_address', 45).nullable()
    table.text('user_agent').nullable()
    table.text('payload')
    table.integer('last_activity').index()
  })
}

export async function down(schema: SchemaBuilder): Promise<void> {
  schema.dropTable('sessions')
}
`
}

function generateAuthController(guard: string, _options: AuthOptions): string {
  const tokenImport = guard === 'token' ? "import { generateToken } from 'speexjs/server/auth'\n" : ''
  const loginLogic =
    guard === 'session'
      ? `    const token = crypto.randomUUID()
    ctx.session.set('auth_token', token)
    ctx.session.set('user_id', user.id)`
      : guard === 'sanctum'
        ? `    const token = user.createToken('auth-token')`
        : `    const token = generateToken(user.id)`

  return `import { Controller, get, post } from 'speexjs/server'
import type { RouteContext } from 'speexjs/server/router'
import { schema } from 'speexjs/schema'
import { User } from '../models/user.model.js'
${tokenImport}
const RegisterSchema = schema.object({
  name: schema.string().min(3).max(100),
  email: schema.string().email(),
  password: schema.string().min(8).max(128),
})

const LoginSchema = schema.object({
  email: schema.string().email(),
  password: schema.string().min(1),
})

export class AuthController extends Controller {
  @post('/auth/register')
  async register({ request, response }: RouteContext) {
    const body = await request.body()
    const result = RegisterSchema.safeParse(body)
    if (!result.success) {
      return response.status(422).json({ error: 'VALIDATION_ERROR', message: result.error })
    }

    const existing = await User.where('email', result.data.email).first()
    if (existing) {
      return response.status(409).json({ error: 'EMAIL_TAKEN', message: 'Email already registered' })
    }

    const hashedPassword = await Bun.password.hash(result.data.password)
    const user = await User.create({
      name: result.data.name,
      email: result.data.email,
      password: hashedPassword,
    })

    return response.status(201).json({ data: { id: user.id, name: user.name, email: user.email } })
  }

  @post('/auth/login')
  async login({ request, response, ctx }: RouteContext) {
    const body = await request.body()
    const result = LoginSchema.safeParse(body)
    if (!result.success) {
      return response.status(422).json({ error: 'VALIDATION_ERROR', message: result.error })
    }

    const user = await User.where('email', result.data.email).first()
    if (!user) {
      return response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
    }

    const valid = await Bun.password.verify(result.data.password, user.password)
    if (!valid) {
      return response.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
    }

${loginLogic}

    return response.json({ data: { id: user.id, name: user.name, email: user.email } })
  }

  @post('/auth/logout')
  async logout({ response, ctx }: RouteContext) {
${guard === 'session' ? `    ctx.session.destroy()` : `    ctx.auth = null`}
    return response.json({ message: 'Logged out successfully' })
  }

  @get('/auth/profile')
  async profile({ response, ctx }: RouteContext) {
${
  guard === 'session'
    ? `    const userId = ctx.session.get('user_id')
    if (!userId) {
      return response.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' })
    }
    const user = await User.find(userId)`
    : `    if (!ctx.auth) {
      return response.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' })
    }
    const user = ctx.auth`
}
    if (!user) {
      return response.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' })
    }

    return response.json({ data: { id: user.id, name: user.name, email: user.email } })
  }

  @post('/auth/forgot-password')
  async forgotPassword({ request, response }: RouteContext) {
    const body = await request.body()
    const email = body?.email
    if (!email) {
      return response.status(422).json({ error: 'VALIDATION_ERROR', message: 'Email is required' })
    }

    const user = await User.where('email', email).first()
    if (user) {
      // In production, send password reset email here
      console.log('Password reset requested for:', email)
    }

    return response.json({ message: 'If the email exists, a reset link has been sent' })
  }
}

export const authController = AuthController
`
}

function generateAuthRoutes(options: AuthOptions): string {
  const imports = `import { AuthController } from './controllers/auth.controller.js'
import { auth } from './middleware/auth.middleware.js'`

  return `${imports}

export function authRoutes(app: any) {
  app.controller(AuthController)

  // Public routes
  app.post('/auth/register', 'AuthController.register')
  app.post('/auth/login', 'AuthController.login')
  app.post('/auth/forgot-password', 'AuthController.forgotPassword')

  // Protected routes
  app.post('/auth/logout', auth(), 'AuthController.logout')
  app.get('/auth/profile', auth(), 'AuthController.profile')
${
  options.views
    ? `
  // Auth views
  app.get('/login', 'AuthController.showLogin')
  app.get('/register', 'AuthController.showRegister')`
    : ''
}
}
`
}

function generateAuthMiddleware(guard: string): string {
  if (guard === 'session') {
    return `import type { RouteContext } from 'speexjs/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const userId = ctx.session?.get('user_id')
    if (!userId) {
      ctx.response.status(401).json({ error: 'UNAUTHORIZED', message: 'Not authenticated' })
      return
    }
    await next()
  }
}

export function guest() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const userId = ctx.session?.get('user_id')
    if (userId) {
      ctx.response.status(302).redirect('/')
      return
    }
    await next()
  }
}
`
  }

  if (guard === 'sanctum') {
    return `import type { RouteContext } from 'speexjs/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const header = ctx.request.headers.get('authorization')
    if (!header || !header.startsWith('Bearer ')) {
      ctx.response.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' })
      return
    }
    await next()
  }
}

export function guest() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const header = ctx.request.headers.get('authorization')
    if (header && header.startsWith('Bearer ')) {
      ctx.response.status(302).redirect('/')
      return
    }
    await next()
  }
}
`
  }

  // token guard (default bearer token)
  return `import type { RouteContext } from 'speexjs/server/router'
import { verifyToken } from 'speexjs/server/auth'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const header = ctx.request.headers.get('authorization')
    if (!header || !header.startsWith('Bearer ')) {
      ctx.response.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing or invalid token' })
      return
    }

    const token = header.slice(7)
    const payload = verifyToken(token)
    if (!payload) {
      ctx.response.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or expired token' })
      return
    }

    ctx.auth = payload
    await next()
  }
}

export function guest() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const header = ctx.request.headers.get('authorization')
    if (header && header.startsWith('Bearer ')) {
      ctx.response.status(302).redirect('/')
      return
    }
    await next()
  }
}
`
}

function generateSessionGuard(): string {
  return `import type { RouteContext } from 'speexjs/server/router'

export function session(options?: Record<string, unknown>) {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    if (ctx.session && ctx.session.get('auth_token')) {
      ctx.auth = { authenticated: true }
    }
    await next()
  }
}
`
}

function generateLoginView(): string {
  return `import type { VNode } from 'speexjs/client/vdom'

interface LoginPageProps {
  error?: string
  title?: string
}

export function LoginPage({ error, title }: LoginPageProps): VNode {
  return {
    type: 'element',
    tag: 'div',
    props: { style: 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:sans-serif' },
    children: [
      {
        type: 'element',
        tag: 'div',
        props: { style: 'background:#1e293b;padding:2rem;border-radius:8px;width:100%;max-width:400px' },
        children: [
          { type: 'element', tag: 'h1', props: { style: 'color:#e2e8f0;margin-bottom:1.5rem;text-align:center' }, children: [{ type: 'text', text: title ?? 'Sign In' }] },
          ...(error ? [{ type: 'element', tag: 'p', props: { style: 'color:#ef4444;margin-bottom:1rem;text-align:center' }, children: [{ type: 'text', text: error }] }] : []),
          {
            type: 'element',
            tag: 'form',
            props: { method: 'POST', action: '/auth/login', style: 'display:flex;flex-direction:column;gap:1rem' },
            children: [
              {
                type: 'element', tag: 'input',
                props: { type: 'email', name: 'email', placeholder: 'Email', required: true,
                  style: 'padding:0.75rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem' },
                children: [],
              },
              {
                type: 'element', tag: 'input',
                props: { type: 'password', name: 'password', placeholder: 'Password', required: true,
                  style: 'padding:0.75rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem' },
                children: [],
              },
              {
                type: 'element', tag: 'button',
                props: { type: 'submit',
                  style: 'padding:0.75rem;border-radius:6px;border:none;background:#3b82f6;color:#fff;font-size:1rem;cursor:pointer;font-weight:500' },
                children: [{ type: 'text', text: 'Sign In' }],
              },
            ],
          },
          {
            type: 'element', tag: 'p', props: { style: 'margin-top:1rem;text-align:center;color:#94a3b8;font-size:0.875rem' },
            children: [
              { type: 'text', text: "Don't have an account? " },
              { type: 'element', tag: 'a', props: { href: '/register', style: 'color:#60a5fa;text-decoration:none' }, children: [{ type: 'text', text: 'Register' }] },
            ],
          },
        ],
      },
    ],
  }
}
`
}

function generateRegisterView(): string {
  return `import type { VNode } from 'speexjs/client/vdom'

interface RegisterPageProps {
  error?: string
  title?: string
}

export function RegisterPage({ error, title }: RegisterPageProps): VNode {
  return {
    type: 'element',
    tag: 'div',
    props: { style: 'display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;font-family:sans-serif' },
    children: [
      {
        type: 'element',
        tag: 'div',
        props: { style: 'background:#1e293b;padding:2rem;border-radius:8px;width:100%;max-width:400px' },
        children: [
          { type: 'element', tag: 'h1', props: { style: 'color:#e2e8f0;margin-bottom:1.5rem;text-align:center' }, children: [{ type: 'text', text: title ?? 'Create Account' }] },
          ...(error ? [{ type: 'element', tag: 'p', props: { style: 'color:#ef4444;margin-bottom:1rem;text-align:center' }, children: [{ type: 'text', text: error }] }] : []),
          {
            type: 'element',
            tag: 'form',
            props: { method: 'POST', action: '/auth/register', style: 'display:flex;flex-direction:column;gap:1rem' },
            children: [
              {
                type: 'element', tag: 'input',
                props: { type: 'text', name: 'name', placeholder: 'Name', required: true,
                  style: 'padding:0.75rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem' },
                children: [],
              },
              {
                type: 'element', tag: 'input',
                props: { type: 'email', name: 'email', placeholder: 'Email', required: true,
                  style: 'padding:0.75rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem' },
                children: [],
              },
              {
                type: 'element', tag: 'input',
                props: { type: 'password', name: 'password', placeholder: 'Password', required: true,
                  style: 'padding:0.75rem;border-radius:6px;border:1px solid #334155;background:#0f172a;color:#e2e8f0;font-size:1rem' },
                children: [],
              },
              {
                type: 'element', tag: 'button',
                props: { type: 'submit',
                  style: 'padding:0.75rem;border-radius:6px;border:none;background:#3b82f6;color:#fff;font-size:1rem;cursor:pointer;font-weight:500' },
                children: [{ type: 'text', text: 'Register' }],
              },
            ],
          },
          {
            type: 'element', tag: 'p', props: { style: 'margin-top:1rem;text-align:center;color:#94a3b8;font-size:0.875rem' },
            children: [
              { type: 'text', text: 'Already have an account? ' },
              { type: 'element', tag: 'a', props: { href: '/login', style: 'color:#60a5fa;text-decoration:none' }, children: [{ type: 'text', text: 'Sign in' }] },
            ],
          },
        ],
      },
    ],
  }
}
`
}

export async function makeAuth(options?: Partial<AuthOptions>): Promise<void> {
  const opts: AuthOptions = {
    guard: options?.guard ?? 'session',
    views: options?.views ?? true,
    api: options?.api ?? false,
  }

  console.log(`  ${colors.cyan('→')} Generating auth scaffold (guard: ${opts.guard})...`)
  console.log()

  const baseDir = resolve(process.cwd())

  // ── Models ──
  const modelsDir = resolve(baseDir, 'src/models')
  mkdirSync(modelsDir, { recursive: true })
  const userModelPath = resolve(modelsDir, 'user.model.ts')
  if (!existsSync(userModelPath)) {
    writeFileSync(userModelPath, generateUserModel(opts.guard), 'utf-8')
    console.log(`  ${colors.green('✅')} Model ${colors.bold('User')} created at ${colors.cyan('src/models/user.model.ts')}`)
  } else {
    console.log(`  ${colors.yellow('⚠')} Model ${colors.bold('User')} already exists — skipped`)
  }

  // ── Migrations ──
  const migrationsDir = resolve(baseDir, 'src/database/migrations')
  mkdirSync(migrationsDir, { recursive: true })

  const userMigrationPath = resolve(migrationsDir, `${Date.now()}_create_users_table.ts`)
  writeFileSync(userMigrationPath, generateUserMigration(), 'utf-8')
  console.log(
    `  ${colors.green('✅')} Migration ${colors.bold('create_users_table')} created at ${colors.cyan(`src/database/migrations/${userMigrationPath.split('\\').pop()!.split('/').pop()!}`)}`,
  )

  const resetMigrationPath = resolve(migrationsDir, `${Date.now() + 1}_create_password_resets_table.ts`)
  writeFileSync(resetMigrationPath, generatePasswordResetMigration(), 'utf-8')
  console.log(`  ${colors.green('✅')} Migration ${colors.bold('create_password_resets_table')} created`)

  if (opts.guard === 'session') {
    const sessionMigrationPath = resolve(migrationsDir, `${Date.now() + 2}_create_sessions_table.ts`)
    writeFileSync(sessionMigrationPath, generateSessionMigration(), 'utf-8')
    console.log(`  ${colors.green('✅')} Migration ${colors.bold('create_sessions_table')} created`)
  }

  // ── Controllers ──
  const controllersDir = resolve(baseDir, 'src/server/controllers')
  mkdirSync(controllersDir, { recursive: true })
  const controllerPath = resolve(controllersDir, 'auth.controller.ts')
  if (!existsSync(controllerPath)) {
    writeFileSync(controllerPath, generateAuthController(opts.guard, opts), 'utf-8')
    console.log(
      `  ${colors.green('✅')} Controller ${colors.bold('AuthController')} created at ${colors.cyan('src/server/controllers/auth.controller.ts')}`,
    )
  } else {
    console.log(`  ${colors.yellow('⚠')} Controller ${colors.bold('AuthController')} already exists — skipped`)
  }

  // ── Middleware ──
  const middlewareDir = resolve(baseDir, 'src/server/middleware')
  mkdirSync(middlewareDir, { recursive: true })
  const middlewarePath = resolve(middlewareDir, 'auth.middleware.ts')
  if (!existsSync(middlewarePath)) {
    writeFileSync(middlewarePath, generateAuthMiddleware(opts.guard), 'utf-8')
    console.log(
      `  ${colors.green('✅')} Middleware ${colors.bold('auth')} created at ${colors.cyan('src/server/middleware/auth.middleware.ts')}`,
    )
  } else {
    console.log(`  ${colors.yellow('⚠')} Middleware ${colors.bold('auth')} already exists — skipped`)
  }

  // ── Session Guard ──
  if (opts.guard === 'session') {
    const gateDir = resolve(baseDir, 'src/server/gate')
    mkdirSync(gateDir, { recursive: true })
    const gatePath = resolve(gateDir, 'session.guard.ts')
    if (!existsSync(gatePath)) {
      writeFileSync(gatePath, generateSessionGuard(), 'utf-8')
      console.log(`  ${colors.green('✅')} Session guard created at ${colors.cyan('src/server/gate/session.guard.ts')}`)
    } else {
      console.log(`  ${colors.yellow('⚠')} Session guard already exists — skipped`)
    }
  }

  // ── Routes ──
  const routesDir = resolve(baseDir, 'src/routes')
  mkdirSync(routesDir, { recursive: true })
  const routesPath = resolve(routesDir, 'auth.ts')
  writeFileSync(routesPath, generateAuthRoutes(opts), 'utf-8')
  console.log(`  ${colors.green('✅')} Auth routes created at ${colors.cyan('src/routes/auth.ts')}`)

  // ── Views (TSX) ──
  if (opts.views) {
    const viewsDir = resolve(baseDir, 'src/client/pages/auth')
    mkdirSync(viewsDir, { recursive: true })

    const loginViewPath = resolve(viewsDir, 'login.tsx')
    writeFileSync(loginViewPath, generateLoginView(), 'utf-8')
    console.log(`  ${colors.green('✅')} Login view created at ${colors.cyan('src/client/pages/auth/login.tsx')}`)

    const registerViewPath = resolve(viewsDir, 'register.tsx')
    writeFileSync(registerViewPath, generateRegisterView(), 'utf-8')
    console.log(`  ${colors.green('✅')} Register view created at ${colors.cyan('src/client/pages/auth/register.tsx')}`)
  }

  console.log()
  console.log(`  ${colors.bold('Auth scaffold complete!')}`)
  console.log()
  console.log(`  ${colors.dim('Next steps:')}`)
  console.log(`  ${colors.cyan('1.')} Import and register authRoutes in your app:`)
  console.log(`     ${colors.dim("import { authRoutes } from './routes/auth.js'")}`)
  console.log(`     ${colors.dim('authRoutes(app)')}`)
  console.log(`  ${colors.cyan('2.')} Run migrations: ${colors.bold('speexjs migrate')}`)
  console.log(`  ${colors.cyan('3.')} Protect routes by adding the auth middleware`)
  console.log(`     ${colors.dim("router.get('/dashboard', auth(), dashboardHandler)")}`)
  console.log()
}
