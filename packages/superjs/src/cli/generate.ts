import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	error,
	resolveTargetDir,
	success,
	toCamelCase,
	toKebabCase,
	toPascalCase,
} from "./utils.js";

export function generateComponent(type: string, name: string): void {
	const targetDir = resolveTargetDir(process.cwd(), type, name);

	if (!existsSync(targetDir)) {
		mkdirSync(targetDir, { recursive: true });
	}

	switch (type) {
		case "controller": {
			generateController(name, targetDir);
			break;
		}
		case "middleware": {
			generateMiddleware(name, targetDir);
			break;
		}
		case "schema": {
			generateSchema(name, targetDir);
			break;
		}
		case "module": {
			generateModule(name, targetDir);
			break;
		}
		default: {
			error(
				`Tipe '${type}' tidak dikenal. Gunakan: controller, middleware, schema, module`,
			);
			process.exit(1);
		}
	}
}

function generateController(name: string, targetDir: string): void {
	const className = `${toPascalCase(name)}Controller`;
	const fileName = `${toKebabCase(name)}.controller.ts`;
	const fullPath = resolve(targetDir, fileName);
	const varName = toCamelCase(name);

	if (existsSync(fullPath)) {
		error(`File ${fileName} sudah ada.`);
		process.exit(1);
	}

	const content = `import { Controller, get, post, put, del } from 'superjs/server'
import type { RouteContext } from 'superjs/server/router'

export class ${className} extends Controller {
  @get('/')
  async index({ response }: RouteContext) {
    return response.json({ data: [] })
  }

  @get('/:id')
  async show({ response, params }: RouteContext) {
    return response.json({ data: { id: params.id } })
  }

  @post('/')
  async store({ request, response }: RouteContext) {
    const body = await request.body()
    return response.json({ data: body }, 201)
  }

  @put('/:id')
  async update({ request, response, params }: RouteContext) {
    const body = await request.body()
    return response.json({ data: { id: params.id, ...body } })
  }

  @del('/:id')
  async destroy({ response, params }: RouteContext) {
    return response.json({ message: \`${className} deleted \${params.id}\` })
  }
}

export const ${varName}Controller = ${className}
`;

	writeFileSync(fullPath, content, "utf-8");
	success(`Controller ${className} dibuat di ${fileName}`);
}

function generateMiddleware(name: string, targetDir: string): void {
	const functionName = toCamelCase(name);
	const fileName = `${toKebabCase(name)}.middleware.ts`;
	const fullPath = resolve(targetDir, fileName);

	if (existsSync(fullPath)) {
		error(`File ${fileName} sudah ada.`);
		process.exit(1);
	}

	const content = `import type { RouteContext } from 'superjs/server/router'

export function ${functionName}(options?: Record<string, unknown>) {
  return async (ctx: RouteContext, next: () => Promise<void>) => {
    const start = Date.now()

    await next()

    const duration = Date.now() - start
    console.log(\`[${toPascalCase(name)}Middleware] \${ctx.request.method} \${ctx.request.path} \${duration}ms\`)
  }
}
`;

	writeFileSync(fullPath, content, "utf-8");
	success(`Middleware ${functionName} dibuat di ${fileName}`);
}

function generateSchema(name: string, targetDir: string): void {
	const schemaName = `${toPascalCase(name)}Schema`;
	const typeName = toPascalCase(name);
	const fileName = `${toKebabCase(name)}.schema.ts`;
	const fullPath = resolve(targetDir, fileName);

	if (existsSync(fullPath)) {
		error(`File ${fileName} sudah ada.`);
		process.exit(1);
	}

	const content = `import { s, type Infer } from 'superjs/schema'

export const ${schemaName} = s.object({
  id: s.string().uuid(),
  name: s.string().min(1).max(255),
  createdAt: s.string().datetime(),
  updatedAt: s.string().datetime().optional(),
})

export type ${typeName} = Infer<typeof ${schemaName}>

export const create${typeName}Schema = s.object({
  name: s.string().min(1).max(255),
})

export type Create${typeName} = Infer<typeof create${typeName}Schema>
`;

	writeFileSync(fullPath, content, "utf-8");
	success(`Schema ${schemaName} dibuat di ${fileName}`);
}

function generateModule(name: string, targetDir: string): void {
	const moduleName = toPascalCase(name);
	const moduleDir = resolve(targetDir, toKebabCase(name));

	if (existsSync(moduleDir)) {
		error(`Module ${moduleDir} sudah ada.`);
		process.exit(1);
	}

	mkdirSync(moduleDir, { recursive: true });

	const files: Record<string, string> = {
		"index.ts": `export { ${moduleName}Module } from './${toKebabCase(name)}.module.js'
`,
		[`${toKebabCase(name)}.module.ts`]: `import { Router } from 'superjs/server/router'

export class ${moduleName}Module {
  readonly router: Router

  constructor() {
    this.router = new Router()
    this.registerRoutes()
  }

  private registerRoutes(): void {
    this.router.get('/', async ({ response }) => {
      return response.json({ message: '${moduleName}Module ready' })
    })
  }
}

export function create${moduleName}Module(): ${moduleName}Module {
  return new ${moduleName}Module()
}
`,
		[`${toKebabCase(name)}.service.ts`]: `export class ${moduleName}Service {
  private items: Map<string, Record<string, unknown>> = new Map()

  findAll(): Record<string, unknown>[] {
    return Array.from(this.items.values())
  }

  findById(id: string): Record<string, unknown> | undefined {
    return this.items.get(id)
  }

  create(data: Record<string, unknown>): Record<string, unknown> {
    const id = crypto.randomUUID()
    const item = { id, ...data, createdAt: new Date().toISOString() }
    this.items.set(id, item)
    return item
  }

  update(id: string, data: Record<string, unknown>): Record<string, unknown> | undefined {
    const existing = this.items.get(id)
    if (existing === undefined) return undefined
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() }
    this.items.set(id, updated)
    return updated
  }

  delete(id: string): boolean {
    return this.items.delete(id)
  }
}
`,
	};

	for (const [filePath, content] of Object.entries(files)) {
		const fullPath = resolve(moduleDir, filePath);
		writeFileSync(fullPath, content, "utf-8");
	}

	success(`Module ${moduleName} dibuat di ${toKebabCase(name)}/`);
}
