import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface TemplateContent {
  dirs: string[]
  files: Record<string, string | ((name: string) => string)>
}

const TEMPLATES: Record<string, TemplateContent> = {
  blank: {
    dirs: ['src'],
    files: {
      'package.json': (name: string) =>
        JSON.stringify(
          {
            name,
            version: '0.1.0',
            type: 'module',
            private: true,
            scripts: {
              dev: 'ConstX serve',
              build: 'ConstX build',
              start: 'node dist/index.js',
            },
            dependencies: {
              ConstX: 'latest',
            },
            devDependencies: {
              '@types/node': '^26.0.1',
              typescript: '^5.7.0',
            },
          },
          null,
          2,
        ),
      'tsconfig.json': JSON.stringify(
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
          },
          include: ['src/**/*.ts'],
          exclude: ['node_modules', 'dist'],
        },
        null,
        2,
      ),
      'src/index.ts': `import { ConstX } from 'ConstX/server'

const app = ConstX()

const PORT = Number(process.env.PORT) || 3000

app.get('/', async ({ response }) => {
  return response.html('<h1>ConstX 🚀</h1>')
})

app.listen(PORT, () => {
  console.log(\`ConstX running on http://localhost:\${PORT}\`)
})
`,
      'src/app.ts': `import { ConstX } from 'ConstX/server'

export function createApp() {
  const app = ConstX()
  return app
}
`,
      '.env.example': `PORT=3000
NODE_ENV=development
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
      'package.json': (name: string) =>
        JSON.stringify(
          {
            name,
            version: '0.1.0',
            type: 'module',
            private: true,
            scripts: {
              dev: 'ConstX serve',
              build: 'tsc',
              start: 'node dist/server/index.js',
            },
            dependencies: {
              ConstX: 'latest',
            },
            devDependencies: {
              '@types/node': '^26.0.1',
              typescript: '^5.7.0',
            },
          },
          null,
          2,
        ),
      'tsconfig.json': JSON.stringify(
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
            jsx: 'react-jsx',
            jsxImportSource: '@ConstX/vdom',
            outDir: './dist',
            rootDir: './src',
          },
          include: ['src/**/*.ts', 'src/**/*.tsx'],
          exclude: ['node_modules', 'dist'],
        },
        null,
        2,
      ),
      'src/server/index.ts': `import { ConstX } from 'ConstX/server'
import { UserController } from './controllers/user.controller.js'

const PORT = Number(process.env.PORT) || 3000

const app = ConstX()

app.controller(UserController)

app.get('/', async ({ response }) => {
  return response.html(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>ConstX Fullstack</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/client/index.js"></script>
    </body>
    </html>
  \`)
})

app.listen(PORT, () => {
  console.log(\`ConstX running on http://localhost:\${PORT}\`)
})
`,
      'src/server/controllers/user.controller.ts': `import { Controller, get, post } from 'ConstX/server'

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
    if (!root) {
      console.error('Root element not found:', selector)
      return
    }
    root.innerHTML = \`
      <div style="text-align:center;padding:2rem">
        <h1>ConstX Fullstack</h1>
        <p>Welcome to ConstX!</p>
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
      '.env.example': `PORT=3000
NODE_ENV=development
`,
      '.gitignore': `node_modules/
dist/
.env
*.log
`,
    },
  },

  'api-only': {
    dirs: ['src', 'src/controllers', 'src/middleware'],
    files: {
      'package.json': (name: string) =>
        JSON.stringify(
          {
            name,
            version: '0.1.0',
            type: 'module',
            private: true,
            scripts: {
              dev: 'ConstX serve',
              build: 'tsc',
              start: 'node dist/index.js',
            },
            dependencies: {
              ConstX: 'latest',
            },
            devDependencies: {
              '@types/node': '^26.0.1',
              typescript: '^5.7.0',
            },
          },
          null,
          2,
        ),
      'tsconfig.json': JSON.stringify(
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
          },
          include: ['src/**/*.ts'],
          exclude: ['node_modules', 'dist'],
        },
        null,
        2,
      ),
      'src/index.ts': `import { ConstX } from 'ConstX/server'

const PORT = Number(process.env.PORT) || 3000

const app = ConstX()

app.get('/api/health', async ({ response }) => {
  return response.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(\`ConstX API running on http://localhost:\${PORT}\`)
})
`,
      'src/controllers/health.controller.ts': `import { Controller, get } from 'ConstX/server'

export class HealthController extends Controller {
  @get('/health')
  async check({ response }) {
    return response.json({
      status: 'ok',
      uptime: process.uptime(),
    })
  }
}
`,
      'src/middleware/auth.ts': `import type { RouteContext } from 'ConstX/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const token = ctx.request.headers.get('authorization')

    if (!token) {
      ctx.response.status(401).json({
        error: 'Unauthorized',
        message: 'Missing authorization header',
      })
      return
    }

    await next()
  }
}
`,
      '.env.example': `PORT=3000
NODE_ENV=development
`,
      '.gitignore': `node_modules/
dist/
.env
*.log
`,
    },
  },
}

const TEMPLATE_ALIASES: Record<string, string> = {
  api: 'api-only',
  full: 'fullstack',
}

function getTemplate(name: string): string {
  return TEMPLATE_ALIASES[name] ?? name
}

function toPascalCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase())
    .replace(/^(.)/, (c: string) => c.toUpperCase())
}

export async function initProject(
  name: string,
  options: Record<string, any>,
): Promise<void> {
  const targetDir = resolve(process.cwd(), name)

  if (existsSync(targetDir)) {
    console.error(colors.red(`Directory '${name}' sudah ada!`))
    process.exit(1)
  }

  const templateName = getTemplate(String(options.template || 'blank'))
  const template = TEMPLATES[templateName]

  if (!template) {
    console.error(
      colors.red(
        `Template '${options.template}' tidak dikenal. Gunakan: blank, fullstack, api-only`,
      ),
    )
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  for (const dir of template.dirs) {
    mkdirSync(resolve(targetDir, dir), { recursive: true })
  }

  for (const [filePath, content] of Object.entries(template.files)) {
    const fullPath = resolve(targetDir, filePath)
    mkdirSync(dirname(fullPath), { recursive: true })

    const resolvedContent =
      typeof content === 'function' ? content(name) : content

    writeFileSync(fullPath, resolvedContent, 'utf-8')
  }

  if (options.git !== false) {
    try {
      const { execSync } = await import('child_process')
      execSync('git init', { cwd: targetDir, stdio: 'ignore' })
    } catch {
      // git not available
    }
  }

  if (options.install !== false) {
    const pm = String(options['package-manager'] || options.packageManager || 'npm')
    try {
      const { execSync } = await import('child_process')
      console.log(`  ${colors.cyan('→')} Installing dependencies with ${pm}...`)
      execSync(`${pm} install`, { cwd: targetDir, stdio: 'inherit' })
    } catch {
      console.log(
        `  ${colors.yellow('!')} Dependency install skipped. Run '${pm} install' manually.`,
      )
    }
  }

  const packageManager = String(options['package-manager'] || options.packageManager || 'npm')

  console.log()
  console.log(`${colors.bold('╔════════════════════════════════════╗')}`)
  console.log(`${colors.bold('║')}        ${colors.green('ConstX 🚀 Project Created')}${colors.bold('       ║')}`)
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
