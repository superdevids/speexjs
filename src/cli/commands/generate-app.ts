import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

interface EntityConfig {
  name: string
  plural: string
  fields: string[]
  relations: string[]
}

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^(.)/, (c) => c.toUpperCase())
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^(.)/, (c) => c.toLowerCase())
}

function toPlural(str: string): string {
  if (str.endsWith('s')) return str
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies'
  if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('x') || str.endsWith('z')) return str + 'es'
  return str + 's'
}

function timestamp(): string {
  return String(Date.now())
}

function inferFields(entityName: string): string[] {
  const defaults: Record<string, string[]> = {
    user: ['name:string', 'email:string', 'password:string'],
    post: ['title:string', 'content:text', 'published:boolean', 'user_id:foreignId'],
    comment: ['content:text', 'post_id:foreignId', 'user_id:foreignId'],
    product: ['name:string', 'description:text', 'price:number', 'stock:number', 'category_id:foreignId'],
    category: ['name:string', 'slug:string', 'description:text'],
    tag: ['name:string', 'slug:string'],
    page: ['title:string', 'content:text', 'slug:string', 'published:boolean'],
    setting: ['key:string', 'value:text'],
    role: ['name:string', 'slug:string'],
    permission: ['name:string', 'slug:string'],
    order: ['status:string', 'total:number', 'user_id:foreignId'],
    review: ['rating:number', 'content:text', 'product_id:foreignId', 'user_id:foreignId'],
    message: ['subject:string', 'content:text', 'sender_id:foreignId', 'recipient_id:foreignId'],
    event: ['title:string', 'description:text', 'start_date:date', 'end_date:date', 'location:string'],
    project: ['name:string', 'description:text', 'status:string', 'user_id:foreignId'],
    task: ['title:string', 'description:text', 'status:string', 'due_date:date', 'project_id:foreignId', 'assignee_id:foreignId'],
    subscription: ['plan:string', 'status:string', 'user_id:foreignId', 'starts_at:date', 'ends_at:date'],
    notification: ['type:string', 'message:text', 'user_id:foreignId', 'read:boolean'],
  }
  const key = entityName.toLowerCase()
  return defaults[key] || ['name:string', 'description:text']
}

function inferRelations(entityName: string, allEntities: string[]): string[] {
  const rels: string[] = []
  const name = entityName.toLowerCase()
  if (name === 'user') {
    allEntities.forEach((e) => {
      const en = e.toLowerCase()
      if (en === 'post' || en === 'comment' || en === 'order' || en === 'project' || en === 'task') {
        rels.push(`hasMany:${toPascalCase(e)}`)
      }
    })
  }
  if (name === 'post') {
    rels.push('belongsTo:User')
    if (allEntities.some((e) => e.toLowerCase() === 'comment')) rels.push('hasMany:Comment')
    if (allEntities.some((e) => e.toLowerCase() === 'tag')) rels.push('belongsToMany:Tag')
  }
  if (name === 'comment') {
    rels.push('belongsTo:Post')
    rels.push('belongsTo:User')
  }
  if (name === 'product') {
    if (allEntities.some((e) => e.toLowerCase() === 'category')) rels.push('belongsTo:Category')
    if (allEntities.some((e) => e.toLowerCase() === 'tag')) rels.push('belongsToMany:Tag')
    if (allEntities.some((e) => e.toLowerCase() === 'review')) rels.push('hasMany:Review')
  }
  if (name === 'review') {
    rels.push('belongsTo:Product')
    rels.push('belongsTo:User')
  }
  if (name === 'order') {
    rels.push('belongsTo:User')
  }
  if (name === 'task') {
    rels.push('belongsTo:Project')
    rels.push('belongsTo:User')
  }
  if (name === 'project') {
    rels.push('belongsTo:User')
    if (allEntities.some((e) => e.toLowerCase() === 'task')) rels.push('hasMany:Task')
  }
  if (name === 'category') {
    if (allEntities.some((e) => e.toLowerCase() === 'product')) rels.push('hasMany:Product')
    if (allEntities.some((e) => e.toLowerCase() === 'post')) rels.push('hasMany:Post')
  }
  return rels
}

function parseDescription(description: string): EntityConfig[] {
  const desc = description.toLowerCase()
  const entities: EntityConfig[] = []

  const patterns: Record<string, string[]> = {
    blog: ['user', 'post', 'comment', 'category', 'tag'],
    ecommerce: ['user', 'product', 'category', 'order', 'review', 'tag'],
    saas: ['user', 'project', 'task', 'subscription', 'notification'],
    cms: ['user', 'page', 'post', 'category', 'tag', 'comment'],
    forum: ['user', 'post', 'comment', 'category'],
    api: ['user'],
    social: ['user', 'post', 'comment', 'message', 'notification'],
    portfolio: ['project', 'category'],
    shop: ['user', 'product', 'category', 'order', 'review'],
    todo: ['project', 'task'],
    admin: ['user', 'role', 'permission', 'setting'],
    booking: ['user', 'event', 'category'],
    realestate: ['user', 'project', 'category'],
    learning: ['user', 'course', 'lesson', 'category'],
  }

  for (const [keyword, entityNames] of Object.entries(patterns)) {
    if (desc.includes(keyword)) {
      for (const en of entityNames) {
        if (!entities.find((e) => e.name === en)) {
          const fields = inferFields(en)
          entities.push({
            name: en,
            plural: toPlural(en),
            fields,
            relations: [],
          })
        }
      }
    }
  }

  if (entities.length === 0) {
    entities.push({
      name: 'user',
      plural: 'users',
      fields: inferFields('user'),
      relations: [],
    })
    entities.push({
      name: 'post',
      plural: 'posts',
      fields: inferFields('post'),
      relations: [],
    })
    entities.push({
      name: 'comment',
      plural: 'comments',
      fields: inferFields('comment'),
      relations: [],
    })
  }

  for (const entity of entities) {
    entity.relations = inferRelations(
      entity.name,
      entities.map((e) => e.name),
    )
  }

  return entities
}

function generateMigration(entity: EntityConfig): string {
  const tableName = entity.plural
  const lines: string[] = []
  lines.push(`import { SchemaBuilder } from 'speexjs/server/database'`)
  lines.push('')
  lines.push(`export async function up(schema: SchemaBuilder): Promise<void> {`)
  lines.push(`  schema.createTable('${tableName}', (table) => {`)
  lines.push(`    table.increments('id')`)

  for (const field of entity.fields) {
    const [name, type] = field.split(':')
    if (!name) continue
    if (type === 'foreignId') {
      lines.push(`    table.integer('${name}').unsigned().references('id').on('users')`)
    } else if (type === 'text') {
      lines.push(`    table.text('${name}').nullable()`)
    } else if (type === 'boolean') {
      lines.push(`    table.boolean('${name}').default(false)`)
    } else if (type === 'number') {
      lines.push(`    table.decimal('${name}', 10, 2).nullable()`)
    } else if (type === 'date') {
      lines.push(`    table.datetime('${name}').nullable()`)
    } else if (type === 'json') {
      lines.push(`    table.json('${name}').nullable()`)
    } else {
      lines.push(`    table.string('${name}', 255).nullable()`)
    }
  }

  for (const rel of entity.relations) {
    const [type, model] = rel.split(':')
    if (type === 'belongsTo' && model) {
      const fk = `${toSnakeCase(model)}_id`
      if (!entity.fields.some((f) => f.startsWith(fk))) {
        lines.push(`    table.integer('${fk}').unsigned().references('id').on('${toPlural(toSnakeCase(model))}')`)
      }
    }
  }

  lines.push(`    table.timestamps()`)
  lines.push(`    table.softDeletes()`)
  lines.push(`  })`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export async function down(schema: SchemaBuilder): Promise<void> {`)
  lines.push(`  schema.dropTable('${tableName}')`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateModel(entity: EntityConfig): string {
  const className = toPascalCase(entity.name)
  const tableName = entity.plural
  const lines: string[] = []

  lines.push(`import { Model } from 'speexjs/server/database'`)
  lines.push('')
  lines.push(`export class ${className} extends Model {`)
  lines.push(`  static table = '${tableName}'`)
  lines.push('')
  lines.push(`  id!: number`)
  for (const field of entity.fields) {
    const [name, type] = field.split(':')
    if (!name) continue
    const tsType =
      type === 'foreignId' || type === 'number'
        ? 'number'
        : type === 'boolean'
          ? 'boolean'
          : type === 'json'
            ? 'Record<string, unknown>'
            : 'string'
    lines.push(`  ${name}!: ${tsType}`)
  }
  lines.push(`  createdAt!: Date`)
  lines.push(`  updatedAt!: Date`)
  lines.push(`  deletedAt?: Date`)
  lines.push('')

  for (const rel of entity.relations) {
    const [type, model] = rel.split(':')
    if (!model) continue
    const relModel = toPascalCase(model)
    const relVar = toCamelCase(model)
    if (type === 'belongsTo') {
      lines.push(`  ${relVar}?: ${relModel}`)
    } else if (type === 'hasMany') {
      lines.push(`  ${toPlural(relVar)}?: ${relModel}[]`)
    } else if (type === 'belongsToMany') {
      lines.push(`  ${toPlural(relVar)}?: ${relModel}[]`)
    }
  }
  lines.push('')

  for (const rel of entity.relations) {
    const [type, model] = rel.split(':')
    if (!model) continue
    const relModel = toPascalCase(model)
    const relVar = toCamelCase(model)
    if (type === 'belongsTo') {
      lines.push(`  static ${relVar}() {`)
      lines.push(`    return this.belongsTo(${relModel}, '${toSnakeCase(model)}_id')`)
      lines.push(`  }`)
      lines.push('')
    } else if (type === 'hasMany') {
      lines.push(`  static ${toPlural(relVar)}() {`)
      lines.push(`    return this.hasMany(${relModel}, '${toSnakeCase(entity.name)}_id')`)
      lines.push(`  }`)
      lines.push('')
    } else if (type === 'belongsToMany') {
      const pivot = [toSnakeCase(entity.name), toSnakeCase(model)].sort().join('_')
      lines.push(`  static ${toPlural(relVar)}() {`)
      lines.push(`    return this.belongsToMany(${relModel}, '${pivot}')`)
      lines.push(`  }`)
      lines.push('')
    }
  }

  lines.push(`  static scopes = {`)
  lines.push(`    recent: (query: any) => query.orderBy('createdAt', 'desc').limit(10),`)
  lines.push(`    search: (query: any, term: string) => {`)
  const searchableField = entity.fields.find((f) => {
    const [, type] = f.split(':')
    return type === 'string' || !type
  })
  if (searchableField) {
    const [name] = searchableField.split(':')
    lines.push(`      query.where('${name}', 'like', \`%$\{term}%\`)`)
  }
  lines.push(`      return query`)
  lines.push(`    },`)
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateController(entity: EntityConfig): string {
  const className = `${toPascalCase(entity.name)}Controller`
  const modelName = toPascalCase(entity.name)
  const varName = toCamelCase(entity.name)
  const path = toKebabCase(entity.plural)

  const lines: string[] = []
  lines.push(`import { Controller, get, post, put, del } from 'speexjs/server/controller'`)
  lines.push(`import type { RouteContext } from 'speexjs/server/router'`)
  lines.push(`import { ${modelName} } from '#models/${toKebabCase(entity.name)}.model'`)
  lines.push('')
  lines.push(`export class ${className} extends Controller {`)
  lines.push(`  @get('/${path}')`)
  lines.push(`  async index({ response, query }: RouteContext) {`)
  lines.push(`    const page = parseInt(String(query.page || '1'))`)
  lines.push(`    const search = String(query.search || '')`)
  lines.push(`    let qb = ${modelName}.query().orderBy('createdAt', 'desc')`)
  if (
    entity.fields.some((f) => {
      const [, type] = f.split(':')
      return type === 'string' || !type
    })
  ) {
    lines.push(`    if (search) {`)
    const [name] = entity.fields
      .find((f) => {
        const [, type] = f.split(':')
        return type === 'string' || !type
      })!
      .split(':')
    lines.push(`      qb.where('${name}', 'like', \`%$\{search}%\`)`)
    lines.push(`    }`)
  }
  lines.push(`    const result = await qb.paginate(15, page)`)
  lines.push(`    return response.json(result)`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @get('/${path}/:id')`)
  lines.push(`  async show({ response, params }: RouteContext) {`)
  lines.push(`    const ${varName} = await ${modelName}.query().where('id', Number(params.id)).first()`)
  lines.push(`    if (!${varName}) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ data: ${varName} })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @post('/${path}')`)
  lines.push(`  async store({ request, response }: RouteContext) {`)
  lines.push(`    const body = await request.body()`)
  const insertFields = entity.fields
    .map((f) => {
      const [name] = f.split(':')
      return name
    })
    .filter(Boolean)
  lines.push(`    const ${varName} = await ${modelName}.query().insert({`)
  for (const name of insertFields) {
    lines.push(`      ${name}: body.${name},`)
  }
  lines.push(`    })`)
  lines.push(`    return response.status(201).json({ data: ${varName} })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @put('/${path}/:id')`)
  lines.push(`  async update({ request, response, params }: RouteContext) {`)
  lines.push(`    const body = await request.body()`)
  lines.push(`    const updated = await ${modelName}.query().where('id', Number(params.id)).update({`)
  for (const name of insertFields) {
    lines.push(`      ${name}: body.${name},`)
  }
  lines.push(`    })`)
  lines.push(`    if (!updated) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ message: '${modelName} updated' })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @del('/${path}/:id')`)
  lines.push(`  async destroy({ response, params }: RouteContext) {`)
  lines.push(`    const deleted = await ${modelName}.query().where('id', Number(params.id)).delete()`)
  lines.push(`    if (!deleted) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ message: '${modelName} deleted' })`)
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export const ${varName}Controller = ${className}`)
  lines.push('')
  return lines.join('\n')
}

function generateRoutes(entities: EntityConfig[]): string {
  const lines: string[] = []
  lines.push(`import { Router } from 'speexjs/server/router'`)
  lines.push('')
  for (const entity of entities) {
    const className = `${toPascalCase(entity.name)}Controller`
    lines.push(`import { ${className} } from '#controllers/${toKebabCase(entity.name)}.controller'`)
  }
  lines.push('')
  lines.push(`export function registerRoutes(router: Router): void {`)
  for (const entity of entities) {
    const path = toKebabCase(entity.plural)
    const className = `${toPascalCase(entity.name)}Controller`
    lines.push(`  router.apiResource('${path}', ${className})`)
  }
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateAppView(entities: EntityConfig[]): string {
  const links = entities
    .map((e) => {
      const path = toKebabCase(e.plural)
      return `          <a href="/api/${path}" class="text-blue-600 hover:underline">GET /api/${path}</a>`
    })
    .join('\n')
  const models = entities
    .map(
      (e) =>
        `    <li>${toPascalCase(e.name)} (${e.fields.filter((f) => f.split(':')[0]).length} fields, ${e.relations.length} relations)</li>`,
    )
    .join('\n')

  return `import type { VNode } from 'speexjs/client/vdom'

export default function AppIndex(): VNode {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My App</title>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-50 min-h-screen">
        <div class="max-w-4xl mx-auto px-4 py-16">
          <h1 class="text-4xl font-bold mb-2">Welcome to Your App</h1>
          <p class="text-gray-600 mb-8">Generated by SpeexJS App Generator</p>
          <div class="bg-white rounded-xl border p-6 mb-8">
            <h2 class="text-lg font-semibold mb-4">Generated Models</h2>
            <ul class="space-y-2">
${models}
            </ul>
          </div>
          <div class="bg-white rounded-xl border p-6">
            <h2 class="text-lg font-semibold mb-4">API Endpoints</h2>
            <div class="flex flex-col gap-2">
${links}
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
`
}

function generateReadme(entities: EntityConfig[], description: string): string {
  const entityList = entities
    .map((e) => {
      const fields = e.fields
        .filter((f) => f.split(':')[0])
        .map((f) => {
          const [name, type] = f.split(':')
          return `    - ${name}: ${type || 'string'}`
        })
        .join('\n')
      const relations = e.relations.length > 0 ? e.relations.map((r) => `    - ${r}`).join('\n') : '    (none)'
      return `### ${toPascalCase(e.name)}\n\n**Table:** ${e.plural}\n\n**Fields:**\n${fields}\n\n**Relations:**\n${relations}`
    })
    .join('\n\n')
  const apiEndpoints = entities
    .map((e) => {
      const path = toKebabCase(e.plural)
      return `- \`GET /api/${path}\` — List ${e.plural}\n- \`GET /api/${path}/:id\` — Show ${e.name}\n- \`POST /api/${path}\` — Create ${e.name}\n- \`PUT /api/${path}/:id\` — Update ${e.name}\n- \`DELETE /api/${path}/:id\` — Delete ${e.name}`
    })
    .join('\n')

  return `# Generated App

**Description:** ${description}

## Models

${entityList}

## API Endpoints

${apiEndpoints}

## Getting Started

\`\`\`bash
# Run migrations
speexjs migrate

# Seed database
speexjs db:seed

# Start server
speexjs serve
\`\`\`
`
}

export async function generateApp(description: string): Promise<void> {
  console.log(`\n  ${colors.bold('SpeexJS App Generator')}`)
  console.log(`  ${colors.gray('Generating fullstack app from description...')}\n`)
  console.log(`  ${colors.cyan('ℹ')} Description: ${colors.bold(description)}\n`)

  const entities = parseDescription(description)

  console.log(`  ${colors.green('✓')} Identified ${entities.length} entities:`)
  for (const entity of entities) {
    console.log(
      `    ${colors.cyan('→')} ${toPascalCase(entity.name)} (${entity.fields.length} fields, ${entity.relations.length} relations)`,
    )
  }
  console.log()

  const cwd = process.cwd()

  const files: Array<{ path: string; content: string; label: string }> = []

  for (const entity of entities) {
    const nameKebab = toKebabCase(entity.name)

    files.push({
      path: resolve(cwd, `src/database/migrations/${timestamp()}_create_${entity.plural}_table.ts`),
      content: generateMigration(entity),
      label: `Migration: create_${entity.plural}_table`,
    })

    files.push({
      path: resolve(cwd, `src/models/${nameKebab}.model.ts`),
      content: generateModel(entity),
      label: `Model: ${toPascalCase(entity.name)}`,
    })

    files.push({
      path: resolve(cwd, `src/server/controllers/${nameKebab}.controller.ts`),
      content: generateController(entity),
      label: `Controller: ${toPascalCase(entity.name)}Controller`,
    })
  }

  const routesContent = generateRoutes(entities)
  files.push({
    path: resolve(cwd, 'src/routes/index.ts'),
    content: routesContent,
    label: 'Routes: API routes',
  })

  files.push({
    path: resolve(cwd, 'src/pages/index.tsx'),
    content: generateAppView(entities),
    label: 'View: home page',
  })

  files.push({
    path: resolve(cwd, 'README.md'),
    content: generateReadme(entities, description),
    label: 'README',
  })

  for (const file of files) {
    mkdirSync(resolve(file.path, '..'), { recursive: true })
    if (existsSync(file.path)) {
      console.log(`  ${colors.yellow('⚠')} Skipped (exists): ${file.label}`)
      continue
    }
    writeFileSync(file.path, file.content, 'utf-8')
    console.log(`  ${colors.green('✓')} Created: ${file.label}`)
  }

  console.log()
  console.log(`  ${colors.green('✅')} App generation complete! ${colors.bold(`${files.length} files`)} created.`)
  console.log(`  ${colors.cyan('→')} Run ${colors.bold('speexjs migrate')} to apply migrations`)
  console.log(`  ${colors.cyan('→')} Run ${colors.bold('speexjs serve')} to start the server`)
}
