import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface ScaffoldOptions {
	template: string;
	frontend: string;
	packageManager: string;
	git: boolean;
	install: boolean;
}

interface TemplateContent {
	dirs: string[];
	files: Record<string, string | ((name: string) => string)>;
}

const TEMPLATES: Record<string, TemplateContent> = {
	blank: {
		dirs: ["src"],
		files: {
			"package.json": (name: string) =>
				JSON.stringify(
					{
						name,
						version: "0.1.0",
						type: "module",
						private: true,
						scripts: {
							dev: "superjs dev",
							build: "superjs build",
							start: "node dist/index.js",
							lint: "biome check src/",
							typecheck: "tsc --noEmit",
						},
						dependencies: {
							superjs: "latest",
						},
						devDependencies: {
							"@biomejs/biome": "^2.5.1",
							"@types/node": "^26.0.1",
							typescript: "^5.7.0",
						},
					},
					null,
					2,
				),
			"tsconfig.json": JSON.stringify(
				{
					compilerOptions: {
						target: "ES2022",
						module: "ESNext",
						moduleResolution: "bundler",
						strict: true,
						noUncheckedIndexedAccess: true,
						noUnusedLocals: true,
						noUnusedParameters: true,
						declaration: true,
						declarationMap: true,
						sourceMap: true,
						esModuleInterop: true,
						isolatedModules: true,
						resolveJsonModule: true,
						outDir: "./dist",
						rootDir: "./src",
						lib: ["ES2022", "DOM", "DOM.Iterable"],
					},
					include: ["src/**/*.ts"],
					exclude: ["node_modules", "dist"],
				},
				null,
				2,
			),
			"src/index.ts": `import { superjs } from 'superjs/server'

const app = superjs()

const PORT = Number(process.env.PORT) || 3000

app.get('/', async ({ response }) => {
  return response.html('<h1>SuperJS 🚀</h1>')
})

app.listen(PORT, () => {
  console.log(\`SuperJS running on http://localhost:\${PORT}\`)
})
`,
			"src/app.ts": `import { superjs } from 'superjs/server'
import { cors, bodyParser, logger } from 'superjs/server/middleware'

export function createApp() {
  const app = superjs()

  app.use(logger())
  app.use(cors())
  app.use(bodyParser())

  return app
}
`,
			".env.example": `PORT=3000
NODE_ENV=development
`,
			".gitignore": `node_modules/
dist/
.env
*.log
.DS_Store
`,
		},
	},

	fullstack: {
		dirs: [
			"src/server",
			"src/server/controllers",
			"src/server/middleware",
			"src/client",
			"src/client/components",
			"src/client/pages",
			"src/shared",
			"src/shared/schemas",
			"public",
		],
		files: {
			"package.json": (name: string) =>
				JSON.stringify(
					{
						name,
						version: "0.1.0",
						type: "module",
						private: true,
						scripts: {
							dev: "superjs dev",
							build: "superjs build",
							start: "node dist/server/index.js",
							lint: "biome check src/",
							typecheck: "tsc --noEmit",
						},
						dependencies: {
							superjs: "latest",
						},
						devDependencies: {
							"@biomejs/biome": "^2.5.1",
							"@types/node": "^26.0.1",
							typescript: "^5.7.0",
						},
					},
					null,
					2,
				),
			"tsconfig.json": (_name: string) =>
				JSON.stringify(
					{
						compilerOptions: {
							target: "ES2022",
							module: "ESNext",
							moduleResolution: "bundler",
							strict: true,
							noUncheckedIndexedAccess: true,
							noUnusedLocals: true,
							noUnusedParameters: true,
							declaration: true,
							declarationMap: true,
							sourceMap: true,
							esModuleInterop: true,
							isolatedModules: true,
							resolveJsonModule: true,
							jsx: "react-jsx",
							jsxImportSource: "@superjs/vdom",
							outDir: "./dist",
							rootDir: "./src",
							lib: ["ES2022", "DOM", "DOM.Iterable"],
						},
						include: ["src/**/*.ts", "src/**/*.tsx"],
						exclude: ["node_modules", "dist"],
					},
					null,
					2,
				),
			"src/server/index.ts": `import { superjs } from 'superjs/server'
import { cors, bodyParser, logger } from 'superjs/server/middleware'
import { UserController } from './controllers/user.controller.js'

const PORT = Number(process.env.PORT) || 3000

const app = superjs()

app.use(logger())
app.use(cors())
app.use(bodyParser())

app.controller(UserController)

app.get('/', async ({ response }) => {
  return response.html(\`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>SuperJS Fullstack</title>
      <link rel="stylesheet" href="/style.css" />
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/client/index.js"></script>
    </body>
    </html>
  \`)
})

app.static('public')

app.listen(PORT, () => {
  console.log(\`SuperJS running on http://localhost:\${PORT}\`)
})
`,
			"src/server/controllers/user.controller.ts": `import { Controller, get, post } from 'superjs/server'

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
			"src/shared/types.ts": `export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  perPage: number
}
`,
			"src/client/index.ts": `import { createApp } from './app.js'

const app = createApp()

document.addEventListener('DOMContentLoaded', () => {
  app.mount('#root')
})
`,
			"src/client/app.ts": `import { createSignal } from 'superjs/client/signals'

export interface AppState {
  count: number
}

export function createApp() {
  const count = createSignal(0)

  function increment() {
    count.set(count.get() + 1)
  }

  function decrement() {
    count.set(count.get() - 1)
  }

  function mount(selector: string) {
    const root = document.querySelector(selector)
    if (root === null) {
      console.error('Root element not found:', selector)
      return
    }

    root.innerHTML = \`
      <div style="text-align:center;padding:2rem">
        <h1>SuperJS Fullstack</h1>
        <p>Counter: \${count.get()}</p>
        <button id="increment">+</button>
        <button id="decrement">-</button>
      </div>
    \`

    document.getElementById('increment')?.addEventListener('click', increment)
    document.getElementById('decrement')?.addEventListener('click', decrement)
  }

  return { count, increment, decrement, mount }
}
`,
			"public/style.css": `* {
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

button {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 1rem;
  margin: 0 0.25rem;
}

button:hover {
  background: #2563eb;
}
`,
			".env.example": `PORT=3000
NODE_ENV=development
`,
			".gitignore": `node_modules/
dist/
.env
*.log
.DS_Store
`,
		},
	},

	"api-only": {
		dirs: ["src", "src/controllers", "src/middleware"],
		files: {
			"package.json": (name: string) =>
				JSON.stringify(
					{
						name,
						version: "0.1.0",
						type: "module",
						private: true,
						scripts: {
							dev: "superjs dev",
							build: "superjs build",
							start: "node dist/index.js",
							lint: "biome check src/",
							typecheck: "tsc --noEmit",
						},
						dependencies: {
							superjs: "latest",
						},
						devDependencies: {
							"@biomejs/biome": "^2.5.1",
							"@types/node": "^26.0.1",
							typescript: "^5.7.0",
						},
					},
					null,
					2,
				),
			"tsconfig.json": JSON.stringify(
				{
					compilerOptions: {
						target: "ES2022",
						module: "ESNext",
						moduleResolution: "bundler",
						strict: true,
						noUncheckedIndexedAccess: true,
						noUnusedLocals: true,
						noUnusedParameters: true,
						declaration: true,
						declarationMap: true,
						sourceMap: true,
						esModuleInterop: true,
						isolatedModules: true,
						resolveJsonModule: true,
						outDir: "./dist",
						rootDir: "./src",
						lib: ["ES2022"],
					},
					include: ["src/**/*.ts"],
					exclude: ["node_modules", "dist"],
				},
				null,
				2,
			),
			"src/index.ts": `import { superjs } from 'superjs/server'
import { cors, bodyParser, logger } from 'superjs/server/middleware'

const PORT = Number(process.env.PORT) || 3000

const app = superjs()

app.use(logger())
app.use(cors({ origin: '*' }))
app.use(bodyParser())

app.get('/api/health', async ({ response }) => {
  return response.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(\`SuperJS API running on http://localhost:\${PORT}\`)
})
`,
			"src/controllers/health.controller.ts": `import { Controller, get } from 'superjs/server'

export class HealthController extends Controller {
  @get('/health')
  async check({ response }) {
    return response.json({
      status: 'ok',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    })
  }
}
`,
			"src/middleware/auth.ts": `import type { RouteContext } from 'superjs/server/router'

export function auth() {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const token = ctx.request.headers.get('authorization')

    if (token === undefined || token === null) {
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
			".env.example": `PORT=3000
NODE_ENV=development
API_KEY=
`,
			".gitignore": `node_modules/
dist/
.env
*.log
.DS_Store
`,
		},
	},
};

const TEMPLATE_ALIASES: Record<string, string> = {
	api: "api-only",
	full: "fullstack",
};

export function getTemplate(name: string): string {
	return TEMPLATE_ALIASES[name] ?? name;
}

export async function scaffoldProject(
	projectName: string,
	options: ScaffoldOptions,
): Promise<void> {
	const targetDir = resolve(process.cwd(), projectName);

	if (existsSync(targetDir)) {
		console.error(`  ❌ Directory ${projectName} already exists.`);
		process.exit(1);
	}

	const templateName = getTemplate(options.template);
	const template = TEMPLATES[templateName];

	if (template === undefined) {
		console.error(
			`  ❌ Template '${options.template}' tidak dikenal. Gunakan: blank, fullstack, api-only`,
		);
		process.exit(1);
	}

	mkdirSync(targetDir, { recursive: true });

	for (const dir of template.dirs) {
		mkdirSync(resolve(targetDir, dir), { recursive: true });
	}

	for (const [filePath, content] of Object.entries(template.files)) {
		const fullPath = resolve(targetDir, filePath);
		mkdirSync(dirname(fullPath), { recursive: true });

		const resolvedContent =
			typeof content === "function" ? content(projectName) : content;

		writeFileSync(fullPath, resolvedContent, "utf-8");
	}

	console.log();
	console.log(`  ✅ Project "${projectName}" berhasil dibuat!`);
	console.log();
	console.log(`  Masuk ke direktori:`);
	console.log(`    cd ${projectName}`);
	console.log();
	console.log(`  Install dependencies:`);
	console.log(`    ${options.packageManager} install`);
	console.log();
	console.log(`  Jalankan development:`);
	console.log(`    ${options.packageManager} run dev`);
	console.log();
}
