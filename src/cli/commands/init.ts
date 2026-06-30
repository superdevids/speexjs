import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { colors } from '../../native/colors.js'

export interface TemplateContent {
  dirs: string[]
  files: Record<string, string | ((name: string) => string)>
}

const PKG_DEPS = { speexjs: 'latest' }
const PKG_DEVDEPS = { '@types/node': '^26.0.1', tsx: '^4.19.0', typescript: '^5.7.0' }

function pkg(name: string, scripts: Record<string, string>, extra: Record<string, any> = {}): string {
  return JSON.stringify(
    {
      name,
      version: '0.1.0',
      type: 'module',
      private: true,
      scripts,
      dependencies: PKG_DEPS,
      devDependencies: { ...PKG_DEVDEPS, ...extra.devDependencies },
      ...extra,
    },
    null,
    2,
  )
}

function tsconfig(compilerExtra: Record<string, any> = {}, topExtra: Record<string, any> = {}): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        strict: true,
        declaration: true,
        sourceMap: true,
        esModuleInterop: true,
        isolatedModules: true,
        resolveJsonModule: true,
        outDir: './dist',
        rootDir: './src',
        skipLibCheck: true,
        types: ['node'],
        ...compilerExtra,
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
      ...topExtra,
    },
    null,
    2,
  )
}

const ENV_EXAMPLE = `# Server
PORT=3000
NODE_ENV=development
HOST=localhost

# Auth (change in production!)
APP_KEY=your-base64-32-byte-key-here
SESSION_SECRET=change-this-in-production
`

const ENV_EXAMPLE_DB = `${ENV_EXAMPLE}
# Database (example)
DATABASE_URL=postgresql://localhost:5432/myapp
`

const GITIGNORE = 'node_modules/\ndist/\n.env\n*.log\n'

const TEMPLATES: Record<string, TemplateContent> = {
  blank: {
    dirs: ['src', 'src/config', 'src/controllers', 'src/middleware', 'src/models'],
    files: {
      'package.json': (name: string) =>
        pkg(name, { dev: 'speexjs serve', build: 'speexjs build', start: 'node dist/index.js', lint: 'tsc --noEmit' }),
      'tsconfig.json': tsconfig({}, { include: ['src/**/*.ts'] }),
      'src/index.ts': `import { speexjs, cors, bodyParser } from 'speexjs/server'
import { HealthController } from './controllers/health.controller.js'
import { UserController } from './controllers/user.controller.js'
import { Config } from './config/index.js'

const app = speexjs()

app.use(cors())
app.use(bodyParser())

app.controller(HealthController)
app.controller(UserController)

app.get('/', ({ response }) => response.html('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>SpeexJS</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,\\'Segoe UI\\',Roboto,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center}.container{padding:2rem}h1{font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{color:#94a3b8;margin-bottom:.5rem}a{color:#60a5fa;text-decoration:none}a:hover{text-decoration:underline}}</style></head><body><div class="container"><h1>SpeexJS</h1><p>Fullstack TypeScript Framework</p><p style="margin-top:1rem"><a href="/api/health">API</a> | <a href="/users">Users</a></p></div></body></html>'))

export { app }
`,
      'src/config/index.ts': `export const Config = {
  port: Number(process.env.PORT ?? '3000'),
  env: process.env.NODE_ENV ?? 'development',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
  isProd: process.env.NODE_ENV === 'production',
  appKey: process.env.APP_KEY ?? '',
}
`,
      'src/controllers/health.controller.ts': `import { Controller, get } from 'speexjs/server'

export class HealthController extends Controller {
  @get('/api/health')
  async check({ response }) {
    return response.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  }
}
`,
      'src/controllers/user.controller.ts': `import { Controller, get, post, put, del } from 'speexjs/server'
import { schema } from 'speexjs/schema'

interface User { id: number; name: string; email: string; createdAt: string }

let users: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date().toISOString() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date().toISOString() },
]
let nextId = 3

const UserSchema = schema.object({
  name: schema.string().min(3).max(100),
  email: schema.string().email(),
})

export class UserController extends Controller {
  @get('/users')
  async index({ response }) {
    return response.json({ data: users })
  }

  @get('/users/:id')
  async show({ response, params }) {
    const user = users.find(u => u.id === Number(params.id))
    if (!user) return response.status(404).json({ error: 'NOT_FOUND', message: 'User not found' })
    return response.json({ data: user })
  }

  @post('/users')
  async store({ request, response }) {
    const body = await request.body()
    const result = UserSchema.safeParse(body)
    if (!result.success) return response.status(422).json({ error: 'VALIDATION_ERROR', message: result.error })
    const user: User = { id: nextId++, name: result.data.name, email: result.data.email, createdAt: new Date().toISOString() }
    users.push(user)
    return response.status(201).json({ data: user })
  }

  @put('/users/:id')
  async update({ request, response, params }) {
    const idx = users.findIndex(u => u.id === Number(params.id))
    if (idx === -1) return response.status(404).json({ error: 'NOT_FOUND', message: 'User not found' })
    const body = await request.body()
    const result = UserSchema.safeParse(body)
    if (!result.success) return response.status(422).json({ error: 'VALIDATION_ERROR', message: result.error })
    users[idx] = { ...users[idx], name: result.data.name, email: result.data.email }
    return response.json({ data: users[idx] })
  }

  @del('/users/:id')
  async destroy({ response, params }) {
    const idx = users.findIndex(u => u.id === Number(params.id))
    if (idx === -1) return response.status(404).json({ error: 'NOT_FOUND', message: 'User not found' })
    users.splice(idx, 1)
    return response.json({ message: 'User deleted' })
  }
}
`,
      'src/middleware/auth.middleware.ts': `import type { RouteContext } from 'speexjs/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const token = ctx.request.headers.get('authorization')
    if (!token) {
      ctx.response.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing authorization header' })
      return
    }
    await next()
  }
}
`,
      '.env.example': `PORT=3000
NODE_ENV=development
APP_KEY=
`,
      '.editorconfig': `root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
`,
      'biome.json': `{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf"
  }
}
`,
      '.gitignore': `node_modules/
dist/
.env
*.log
`,
    },
  },

  fullstack: {
    dirs: [
      'src/server',
      'src/server/controllers',
      'src/server/middleware',
      'src/client',
      'src/client/components',
      'src/client/pages',
      'src/shared',
      'public',
    ],
    files: {
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'tsc', start: 'node dist/server/index.js' }),
      'tsconfig.json': tsconfig({ jsx: 'react-jsx', jsxImportSource: '@speexjs/vdom' }, { include: ['src/**/*.ts', 'src/**/*.tsx'] }),
      'src/server/index.ts': `import { speexjs } from 'speexjs/server'
import type { RouteContext } from 'speexjs/server/router'
import { UserController } from './controllers/user.controller.js'

const PORT = Number(process.env.PORT) || 3000
const app = speexjs()

app.controller(UserController)

app.get('/', async ({ response }: RouteContext) => {
  return response.html(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>SpeexJS Fullstack</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
               background: #0f172a; color: #e2e8f0; display: flex; align-items: center;
               justify-content: center; min-height: 100vh; text-align: center; }
        .container { padding: 2rem; }
        h1 { font-size: 2.5rem; background: linear-gradient(135deg,#60a5fa,#a78bfa);
             -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 1rem; }
        p { color: #94a3b8; margin-bottom: 0.5rem; }
        .links { margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; }
        a { padding: .75rem 1.5rem; border-radius: 6px; text-decoration: none; font-weight: 500; }
        .btn-primary { background: #3b82f6; color: #fff; }
        .btn-secondary { background: #1e293b; color: #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>SpeexJS</h1>
        <p>Fullstack TypeScript Framework — Zero dependencies.</p>
        <div class="links">
          <a href="/api/health" class="btn-primary">API Health</a>
          <a href="/users" class="btn-secondary">Users</a>
        </div>
      </div>
    </body>
    </html>
  \`)
})

export { app }
`,
      'src/server/controllers/user.controller.ts': `import { Controller, get, post } from 'speexjs/server'
import type { RouteContext } from 'speexjs/server/router'

export class UserController extends Controller {
  @get('/users')
  async index({ response }: RouteContext) {
    return response.json({ data: [{ id: 1, name: 'John Doe', email: 'john@example.com' }] })
  }

  @post('/users')
  async store({ request, response }: RouteContext) {
    const body = await request.body()
    return response.json({ data: body }, 201)
  }
}
`,
      'src/client/index.ts': `import { createApp } from './app.js'

document.addEventListener('DOMContentLoaded', () => {
  createApp().mount('#root')
})
`,
      'src/client/app.tsx': `import { Welcome } from './pages/welcome.js'

export function createApp() {
  function mount(selector: string) {
    const root = document.querySelector(selector)
    if (!root) { console.error('Root element not found:', selector); return }
    root.innerHTML = \`<div style="text-align:center;padding:2rem;font-family:sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column">
      <h1 style="font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(135deg,#60a5fa,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent">SpeexJS</h1>
      <p style="color:#94a3b8;margin-bottom:2rem">Fullstack TypeScript Framework</p>
      <div style="display:flex;gap:1rem">
        <a href="/api/health" style="padding:.75rem 1.5rem;background:#3b82f6;color:#fff;border-radius:6px;text-decoration:none">API Health</a>
        <a href="/users" style="padding:.75rem 1.5rem;background:#1e293b;color:#e2e8f0;border-radius:6px;text-decoration:none">Users</a>
      </div>
    </div>\`
  }
  return { mount }
}
`,
      'src/client/pages/welcome.tsx': `import type { VNode } from 'speexjs/client/vdom'

export function Welcome(props: Record<string, unknown>): VNode {
  return {
    type: 'element',
    tag: 'div',
    props: { style: 'text-align:center;padding:2rem;font-family:sans-serif' },
    children: [
      { type: 'element', tag: 'h1', props: { style: 'font-size:2.5rem;color:#60a5fa' }, children: [{ type: 'text', text: 'SpeexJS' }] },
      { type: 'element', tag: 'p', props: { style: 'color:#94a3b8' }, children: [{ type: 'text', text: 'Welcome to SpeexJS Fullstack!' }] },
    ],
  }
}
`,
      'public/style.css': `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
}

#root {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
`,
      'src/shared/types.ts': `export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
}
`,
      '.env.example': ENV_EXAMPLE_DB,
      '.gitignore': GITIGNORE,
    },
  },

  'api-only': {
    dirs: ['src', 'src/config', 'src/controllers', 'src/middleware'],
    files: {
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'tsc', start: 'node dist/index.js' }),
      'tsconfig.json': tsconfig(),
      'src/index.ts': `import { speexjs } from 'speexjs/server'
import type { RouteContext } from 'speexjs/server/router'
import { HealthController } from './controllers/health.controller.js'

const PORT = Number(process.env.PORT) || 3000
const app = speexjs()

app.controller(HealthController)

app.get('/api/health', async ({ response }: RouteContext) => {
  return response.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export { app }
`,
      'src/config/index.ts': `export const Config = {
  port: Number(process.env.PORT) || 3000,
  host: process.env.HOST ?? 'localhost',
  env: process.env.NODE_ENV ?? 'development',
  appKey: process.env.APP_KEY ?? '',
  isDev: (process.env.NODE_ENV ?? 'development') !== 'production',
  isProd: process.env.NODE_ENV === 'production',
}
`,
      'src/controllers/health.controller.ts': `import { Controller, get } from 'speexjs/server'
import { schema } from 'speexjs/schema'

const HealthResponse = schema.object({
  status: schema.string(),
  uptime: schema.number(),
  timestamp: schema.string(),
})

export class HealthController extends Controller {
  @get('/health')
  async check({ response }) {
    const payload = HealthResponse.parse({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    })
    return response.json(payload)
  }
}
`,
      'src/middleware/auth.ts': `import type { RouteContext } from 'speexjs/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const token = ctx.request.headers.get('authorization')
    if (!token) {
      ctx.response.status(401).json({ error: 'Unauthorized', message: 'Missing authorization header' })
      return
    }
    await next()
  }
}
`,
      '.env.example': ENV_EXAMPLE_DB,
      '.gitignore': GITIGNORE,
    },
  },

  spark: {
    dirs: ['src', 'src/controllers', 'src/middleware', 'src/config', 'src/database/migrations', 'src/models'],
    files: {
      'package.json': (name: string) =>
        pkg(name, { dev: 'speexjs serve', build: 'tsc', start: 'node dist/index.js', lint: 'biome check src/' }),
      'tsconfig.json': tsconfig({}, { skipLibCheck: true }),
      'src/index.ts': `import { speexjs, cors, bodyParser, csrf } from 'speexjs/server'
import { schema } from 'speexjs/schema'

const app = speexjs()
const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(bodyParser())
app.use(csrf())

app.get('/api/health', async ({ response }) => {
  return response.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export { app }
`,
      'src/config/index.ts': `export const Config = {
  port: Number(process.env.PORT ?? '3000'),
  env: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  appKey: process.env.APP_KEY ?? '',
}
`,
      '.env.example': 'PORT=3000\nNODE_ENV=development\nAPP_KEY=\n',
      '.gitignore': GITIGNORE,
    },
  },
}

const TEMPLATE_ALIASES: Record<string, string> = { api: 'api-only', full: 'fullstack', spark: 'spark', blog: 'blog' }

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  blank: 'Minimal API with in-memory CRUD',
  fullstack: 'Full stack with server + client VDOM',
  'api-only': 'Lean API-only scaffold',
  spark: 'Opinionated with middleware stack',
  blog: 'Blog with posts, categories, comments, and tags',
  saas: 'SaaS with teams, billing, roles, and subscriptions',
  ecommerce: 'Ecommerce with products, cart, checkout, and orders',
}

function getTemplate(name: string): string {
  return TEMPLATE_ALIASES[name] ?? name
}

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase())
}

function askQuestion(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function selectTemplateInteractive(): Promise<string> {
  console.log(`\n  ${colors.bold('Select a project template:')}\n`)

  const allTemplateNames = Object.keys(TEMPLATES)
  const starters = ['blog', 'saas', 'api', 'ecommerce']
  const classic = allTemplateNames.filter((t) => !starters.includes(t))

  console.log(`  ${colors.bold('Classic Templates:')}`)
  for (const name of classic) {
    const alias = Object.entries(TEMPLATE_ALIASES).find(([, v]) => v === name)?.[0]
    const label = alias ? `${name} (alias: ${alias})` : name
    const desc = TEMPLATE_DESCRIPTIONS[name] || ''
    console.log(`    ${colors.cyan(label.padEnd(25))} ${colors.dim(desc)}`)
  }

  console.log(`\n  ${colors.bold('Official Starters:')}`)
  for (const name of starters) {
    const desc = TEMPLATE_DESCRIPTIONS[name] || ''
    console.log(`    ${colors.green(name.padEnd(25))} ${colors.dim(desc)}`)
  }

  console.log()
  const answer = await askQuestion(`  ${colors.yellow('→')} Which template? ${colors.dim('[fullstack]')}: `)
  return answer || 'fullstack'
}

async function loadStarterTemplates(): Promise<void> {
  try {
    const { STARTER_TEMPLATES } = await import('../templates/index.js')
    for (const [key, value] of Object.entries(STARTER_TEMPLATES)) {
      TEMPLATES[key] = value
    }
  } catch {
    console.log(`  ${colors.yellow('!')} Starter templates not found, using built-in templates only.`)
  }
}

// ─── Conversational CLI Wizard ───────────────────────────────────

interface WizardAnswers {
  name: string
  template: string
  features: string[]
  database: string
  deploy: string
  install: boolean
}

const TEMPLATES_WIZARD = [
  { id: 'blank', name: 'Blank', desc: 'Minimal HTTP server' },
  { id: 'fullstack', name: 'Fullstack Web App', desc: 'Server + Client VDOM + Auth + DB + Queue' },
  { id: 'api-only', name: 'REST API', desc: 'API server with DB, Auth, OpenAPI' },
  { id: 'saas', name: 'SaaS Application', desc: 'Auth, DB, Queue, Mail, RBAC, Billing-ready' },
  { id: 'blog', name: 'Blog / CMS', desc: 'Auth, DB, i18n, Static pages' },
  { id: 'realtime', name: 'Real-time App', desc: 'Auth, DB, WebSocket, Queue, SSE' },
  { id: 'ecommerce', name: 'E-commerce', desc: 'Auth, DB, Queue, Mail, Payments' },
  { id: 'minimal', name: 'Minimal', desc: 'HTTP server + Router only' },
]

const ALL_FEATURES = [
  { id: 'auth', name: 'Authentication', desc: 'Login, register, password reset, OAuth' },
  { id: 'db', name: 'Database ORM', desc: 'Models, migrations, query builder' },
  { id: 'queue', name: 'Queue & Jobs', desc: 'Background job processing' },
  { id: 'websocket', name: 'WebSocket', desc: 'Real-time bidirectional communication' },
  { id: 'email', name: 'Email', desc: 'SMTP mail sending with templates' },
  { id: 'cache', name: 'Cache', desc: 'In-memory and Redis caching' },
  { id: 'admin', name: 'Admin Panel', desc: 'CRUD admin interface' },
  { id: 'ai', name: 'AI Features', desc: 'AI agents, NL queries, code generation' },
]

const DATABASES = [
  { id: 'mysql', name: 'MySQL', desc: 'Popular relational database' },
  { id: 'postgresql', name: 'PostgreSQL', desc: 'Advanced relational database' },
  { id: 'sqlite', name: 'SQLite', desc: 'Embedded file-based database' },
]

const DEPLOY_TARGETS = [
  { id: 'node', name: 'Node.js', desc: 'Standard Node.js deployment' },
  { id: 'docker', name: 'Docker', desc: 'Containerized with Docker' },
  { id: 'vercel', name: 'Vercel', desc: 'Deploy to Vercel serverless' },
  { id: 'railway', name: 'Railway', desc: 'Deploy to Railway' },
  { id: 'flyio', name: 'Fly.io', desc: 'Deploy to Fly.io' },
]

function createPrompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(`  ${colors.cyan('?')} ${question}\n  ${colors.dim('→')} `)
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim())
    })
  })
}

function createChoicePrompt(question: string, choices: { id: string; name: string; desc: string }[], multi: boolean): Promise<string[]> {
  return new Promise((resolve) => {
    console.log(`\n  ${colors.cyan('?')} ${question}`)
    choices.forEach((c, i) => {
      console.log(`  ${colors.dim(`${i + 1})`)} ${c.name} ${colors.dim('- ' + c.desc)}`)
    })
    console.log()
    if (multi) {
      process.stdout.write(`  ${colors.dim('Enter numbers separated by commas (e.g. 1,3,5) or "all" or "none": ')}`)
    } else {
      process.stdout.write(`  ${colors.dim(`Enter number (1-${choices.length}): `)}`)
    }

    process.stdin.once('data', (data) => {
      const input = data.toString().trim().toLowerCase()
      if (input === 'all' && multi) {
        resolve(choices.map(c => c.id))
        return
      }
      if (input === 'none' && multi) {
        resolve([])
        return
      }
      const parts = input.split(',').map(p => p.trim())
      const selected = parts.map(p => {
        const idx = parseInt(p, 10) - 1
        return idx >= 0 && idx < choices.length ? choices[idx]!.id : null
      }).filter(Boolean) as string[]
      resolve(selected)
    })
  })
}

async function runWizard(args: Record<string, any>): Promise<WizardAnswers> {
  const name = args._?.[0] || (await createPrompt('Project name:')) || 'my-speexjs-app'

  const templateIds = args.template
    ? [args.template]
    : await createChoicePrompt('What are you building?', TEMPLATES_WIZARD, false)

  const defaultFeatures: Record<string, string[]> = {
    blank: [],
    minimal: [],
    'api-only': ['auth', 'db'],
    fullstack: ['auth', 'db', 'queue'],
    saas: ['auth', 'db', 'queue', 'email', 'cache'],
    blog: ['auth', 'db', 'cache'],
    realtime: ['auth', 'db', 'websocket', 'queue'],
    ecommerce: ['auth', 'db', 'queue', 'email'],
  }

  const recommended = defaultFeatures[templateIds[0]!] || []

  console.log(`\n  ${colors.dim(`Recommended features for ${templateIds[0]}: ${recommended.join(', ') || 'none'}`)}`)

  const features = args.features
    ? args.features.split(',')
    : await createChoicePrompt(
        'Which features do you need? (recommended pre-selected)',
        ALL_FEATURES,
        true,
      )

  const finalFeatures = features.length > 0 ? features : recommended

  const dbDialect = args.db
    ? args.db
    : finalFeatures.includes('db')
      ? (await createChoicePrompt('Which database?', DATABASES, false))[0] || 'sqlite'
      : 'sqlite'

  const deploy = args.deploy
    ? args.deploy
    : (await createChoicePrompt('Deployment target?', DEPLOY_TARGETS, false))[0] || 'node'

  const installAnswer = await createPrompt('Install dependencies now? (Y/n)')
  const install = installAnswer.toLowerCase() !== 'n'

  return {
    name: name.replace(/[^a-z0-9_-]/gi, '-').toLowerCase(),
    template: templateIds[0],
    features: finalFeatures,
    database: dbDialect,
    deploy,
    install,
  }
}

function getTemplateContent(templateId: string, answers: WizardAnswers): TemplateContent {
  const baseDirs = ['src', 'src/routes', 'public']
  const baseFiles: Record<string, string | ((name: string) => string)> = {}

  const templateAdditions: Record<string, { dirs: string[]; files: Record<string, string | ((name: string) => string)> }> = {
    fullstack: {
      dirs: ['src/controllers', 'src/views', 'src/views/layouts'],
      files: {},
    },
    saas: {
      dirs: ['src/controllers', 'src/jobs', 'src/middleware', 'src/views'],
      files: {},
    },
    'api-only': {
      dirs: ['src/controllers'],
      files: {},
    },
  }

  const featureAdditions: Record<string, string[]> = {
    auth: ['src/controllers/Auth', 'src/models', 'src/schemas', 'src/middleware'],
    db: ['src/models', 'src/database', 'src/database/migrations', 'src/database/seeders'],
    queue: ['src/jobs'],
    websocket: ['src/websocket', 'src/websocket/channels'],
    email: ['src/mail', 'src/mail/templates'],
    cache: [],
    admin: ['src/admin'],
    ai: ['src/ai', 'src/ai/agents', 'src/ai/prompts'],
  }

  const allDirs = [...baseDirs]
  const templateExtra = templateAdditions[templateId]
  if (templateExtra) {
    allDirs.push(...templateExtra.dirs)
  }
  for (const feature of answers.features) {
    const extraDirs = featureAdditions[feature]
    if (extraDirs) {
      allDirs.push(...extraDirs)
    }
  }

  const dirs = [...new Set(allDirs)]

  const files: Record<string, string | ((name: string) => string)> = {
    ...baseFiles,
  }
  if (templateExtra) {
    Object.assign(files, templateExtra.files)
  }

  return { dirs, files }
}

export async function initProject(name: string, options: Record<string, any>): Promise<void> {
  const targetDir = resolve(process.cwd(), name)

  if (existsSync(targetDir)) {
    console.error(colors.red(`Directory '${name}' already exists!`))
    process.exit(1)
  }

  await loadStarterTemplates()

  let templateName: string
  let wizardAnswers: WizardAnswers | undefined

  if (options.wizard || !options.template) {
    wizardAnswers = await runWizard({ ...options, _: [name] })
    templateName = getTemplate(wizardAnswers.template)
  } else {
    templateName = getTemplate(String(options.template))
  }

  const template = TEMPLATES[templateName]

  if (!template) {
    const available = Object.keys(TEMPLATES).join(', ')
    console.error(colors.red(`Unknown template '${templateName}'. Available: ${available}`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const allDirs = new Set(template.dirs)
  if (wizardAnswers) {
    const wizardContent = getTemplateContent(templateName, wizardAnswers)
    for (const dir of wizardContent.dirs) {
      allDirs.add(dir)
    }
  }

  for (const dir of allDirs) {
    mkdirSync(resolve(targetDir, dir), { recursive: true })
  }

  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = resolve(targetDir, filePath)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, typeof content === 'function' ? content(name) : content, 'utf-8')
  }

  if (options.git !== false) {
    try {
      const { execSync } = await import('child_process')
      execSync('git init', { cwd: targetDir, stdio: 'ignore' })
    } catch {
      /* git not available */
    }
  }

  const shouldInstall = wizardAnswers ? wizardAnswers.install : (options.install !== false)
  if (shouldInstall) {
    const pm = String(options['package-manager'] || options.packageManager || 'npm')
    try {
      const { execSync } = await import('child_process')
      console.log(`  ${colors.cyan('→')} Installing dependencies with ${pm}...`)
      execSync(`${pm} install`, { cwd: targetDir, stdio: 'inherit' })
    } catch {
      console.log(`  ${colors.yellow('!')} Dependency install skipped. Run '${pm} install' manually.`)
    }
  }

  const packageManager = String(options['package-manager'] || options.packageManager || 'npm')

  console.log()
  console.log(`${colors.bold('╔══════════════════════════════════════════╗')}`)
  console.log(
    `${colors.bold('║')}          ${colors.green('SpeexJS')} ${colors.cyan('🚀')} ${colors.bold('Project Created')}         ${colors.bold('║')}`,
  )
  console.log(`${colors.bold('╠══════════════════════════════════════════╣')}`)
  console.log(`${colors.bold('║')}  ${colors.dim('Name:')}     ${colors.white(toPascalCase(name))}`)
  console.log(`${colors.bold('║')}  ${colors.dim('Template:')} ${colors.cyan(templateName)}`)
  if (wizardAnswers?.features.length) {
    console.log(`${colors.bold('║')}  ${colors.dim('Features:')} ${colors.white(wizardAnswers.features.join(', '))}`)
  }
  console.log(`${colors.bold('║')}  ${colors.dim('Dir:')}      ${colors.white(targetDir)}`)
  console.log(`${colors.bold('╚══════════════════════════════════════════╝')}`)
  console.log()
  console.log(`  ${colors.cyan('$')} cd ${name}`)
  console.log(`  ${colors.cyan('$')} ${packageManager} run dev`)
  console.log()
}
