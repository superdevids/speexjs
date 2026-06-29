import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface TemplateContent {
  dirs: string[]
  files: Record<string, string | ((name: string) => string)>
}

const PKG_DEPS = { speexjs: 'latest' }
const PKG_DEVDEPS = { '@types/node': '^26.0.1', tsx: '^4.19.0', typescript: '^5.7.0' }

function pkg(name: string, scripts: Record<string, string>, extra: Record<string, any> = {}): string {
  return JSON.stringify({ name, version: '0.1.0', type: 'module', private: true, scripts, dependencies: PKG_DEPS, devDependencies: { ...PKG_DEVDEPS, ...extra.devDependencies }, ...extra }, null, 2)
}

function tsconfig(compilerExtra: Record<string, any> = {}, topExtra: Record<string, any> = {}): string {
  return JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler', strict: true, declaration: true, sourceMap: true, esModuleInterop: true, isolatedModules: true, resolveJsonModule: true, outDir: './dist', rootDir: './src', skipLibCheck: true, types: ['node'], ...compilerExtra },
    include: ['src/**/*.ts'],
    exclude: ['node_modules', 'dist'],
    ...topExtra,
  }, null, 2)
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
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'speexjs build', start: 'node dist/index.js', lint: 'tsc --noEmit' }),
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
    dirs: ['src/server', 'src/server/controllers', 'src/server/middleware', 'src/client', 'src/client/components', 'src/client/pages', 'src/shared', 'public'],
    files: {
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'tsc', start: 'node dist/server/index.js' }),
      'tsconfig.json': tsconfig({ jsx: 'react-jsx', jsxImportSource: '@speexjs/vdom' }, { include: ['src/**/*.ts', 'src/**/*.tsx'] }),
      'src/server/index.ts': `import { speexjs } from 'speexjs/server'
import { schema } from 'speexjs/schema'
import { UserController } from './controllers/user.controller.js'

const PORT = Number(process.env.PORT) || 3000

const app = speexjs()

app.controller(UserController)

app.get('/', async ({ response }) => {
  return response.html(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>SpeexJS Fullstack</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/client/index.js"></script>
    </body>
    </html>
  \`)
})

export { app }
`,
      'src/server/controllers/user.controller.ts': `import { Controller, get, post } from 'speexjs/server'

export class UserController extends Controller {
  @get('/users')
  async index({ response }) {
    return response.json({ data: [] })
  }

  @post('/users')
  async store({ request, response }) {
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
      'src/client/app.ts': `export function createApp() {
  function mount(selector: string) {
    const root = document.querySelector(selector)
    if (!root) { console.error('Root element not found:', selector); return }
    root.innerHTML = \`
      <div style="text-align:center;padding:2rem">
        <h1>SpeexJS Fullstack</h1>
        <p>Welcome to SpeexJS!</p>
      </div>
    \`
  }
  return { mount }
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
import { schema } from 'speexjs/schema'
import { Config } from './config/index.js'
import { HealthController } from './controllers/health.controller.js'

const app = speexjs()

app.controller(HealthController)

app.get('/api/health', async ({ response }) => {
  return response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: Config.env,
  })
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
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'tsc', start: 'node dist/index.js', lint: 'biome check src/' }),
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

  blog: {
    dirs: ['src', 'src/config', 'src/controllers', 'src/middleware', 'src/models', 'public'],
    files: {
      'package.json': (name: string) => pkg(name, { dev: 'speexjs serve', build: 'speexjs build', start: 'node dist/index.js' }),
      'tsconfig.json': tsconfig({ jsx: 'react-jsx', jsxImportSource: '@speexjs/vdom' }, { include: ['src/**/*.ts', 'src/**/*.tsx'] }),
      'src/index.ts': `import { speexjs, cors, bodyParser, staticFiles } from 'speexjs/server'
import { Config } from './config/index.js'

const app = speexjs()

app.use(cors())
app.use(staticFiles('public', { maxAge: 86400 }))
app.use(bodyParser())

app.get('/', ({ response }) => response.html(\`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>My Blog</title></head><body style="font-family:sans-serif;padding:2rem;max-width:800px;margin:0 auto;"><h1>My Blog</h1><p>Welcome to my blog.</p></body></html>\`))

export { app }
`,
      'src/config/index.ts': `export const Config = { port: Number(process.env.PORT ?? '3000'), env: process.env.NODE_ENV ?? 'development' }`,
      'src/pages/home.tsx': `import type { VNode } from 'speexjs/client/vdom'
interface Props { title?: string }
export default function Home({ title }: Props): VNode {
  return <html lang="en"><head><meta charset="utf-8"/><title>{title ?? 'Blog'}</title></head>
  <body style="font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h1>{title ?? 'My Blog'}</h1><p>Welcome to my blog built with SpeexJS!</p>
  </body></html>
}`,
      'src/pages/post.tsx': `import type { VNode } from 'speexjs/client/vdom'
interface Props { slug?: string }
export default function Post({ slug }: Props): VNode {
  return <html lang="en"><head><meta charset="utf-8"/><title>{slug ?? 'Post'}</title></head>
  <body style="font-family: sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
  <h1>Post: {slug}</h1><a href="/" style="color: #0066cc;">Back</a>
  </body></html>
}`,
      '.env.example': 'PORT=3000\nNODE_ENV=development\n',
      '.gitignore': 'node_modules/\ndist/\n.env\n',
    },
  },
}

const TEMPLATE_ALIASES: Record<string, string> = { api: 'api-only', full: 'fullstack', spark: 'spark', blog: 'blog' }

function getTemplate(name: string): string {
  return TEMPLATE_ALIASES[name] ?? name
}

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase())
}

export async function initProject(name: string, options: Record<string, any>): Promise<void> {
  const targetDir = resolve(process.cwd(), name)

  if (existsSync(targetDir)) {
    console.error(colors.red(`Directory '${name}' already exists!`))
    process.exit(1)
  }

  const templateName = getTemplate(String(options.template || 'blank'))
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error(colors.red(`Unknown template '${options.template}'. Use: blank, fullstack, api-only, spark, blog`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  for (const dir of template.dirs) {
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
    } catch { /* git not available */ }
  }

  if (options.install !== false) {
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
  console.log(`${colors.bold('╔════════════════════════════════════╗')}`)
  console.log(`${colors.bold('║')}  ${colors.green('SpeexJS 🚀 Project Created')}${colors.bold('       ║')}`)
  console.log(`${colors.bold('╚════════════════════════════════════╝')}`)
  console.log()
  console.log(`  ${colors.bold('Name:')}     ${toPascalCase(name)}`)
  console.log(`  ${colors.bold('Template:')} ${templateName}`)
  console.log(`  ${colors.bold('Dir:')}      ${targetDir}`)
  console.log()
  console.log(`  ${colors.cyan('$')} cd ${name}`)
  console.log(`  ${colors.cyan('$')} ${packageManager} run dev`)
  console.log()
}
