import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { colors } from '../../native/colors.js'

type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'enum' | 'json' | 'foreignId'

type RelationType = 'belongsTo' | 'hasMany' | 'belongsToMany'

interface CrudField {
  name: string
  type: FieldType
  validation: string
  enumValues?: string[]
  relatedModel?: string
}

interface CrudRelation {
  type: RelationType
  model: string
  foreignKey?: string
  localKey?: string
  pivotTable?: string
}

interface CrudConfig {
  modelName: string
  fields: CrudField[]
  relations: CrudRelation[]
  generateViews: boolean
}

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase())
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
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toLowerCase())
}

function toPlural(str: string): string {
  if (str.endsWith('s')) return str
  if (str.endsWith('y')) return str.slice(0, -1) + 'ies'
  if (str.endsWith('ch') || str.endsWith('sh') || str.endsWith('x') || str.endsWith('z')) return str + 'es'
  return str + 's'
}

function timestamp(): string {
  return `${Date.now()}`
}

function fieldTypeToMigration(field: CrudField): string {
  switch (field.type) {
    case 'string':
    case 'email':
    case 'url':
      return 'string'
    case 'text':
      return 'text'
    case 'number':
      return 'integer'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'datetime'
    case 'enum':
      return 'string'
    case 'json':
      return 'json'
    case 'foreignId':
      return 'integer'
  }
}

function fieldTypeToTs(field: CrudField): string {
  switch (field.type) {
    case 'string':
    case 'email':
    case 'url':
    case 'enum':
      return 'string'
    case 'text':
      return 'string'
    case 'number':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'date':
      return 'Date'
    case 'json':
      return 'Record<string, unknown>'
    case 'foreignId':
      return 'number'
  }
}

function generateMigration(config: CrudConfig): string {
  const tableName = toPlural(toSnakeCase(config.modelName))
  const lines: string[] = []
  lines.push(`import { SchemaBuilder } from 'speexjs/server/database'`)
  lines.push('')
  lines.push(`export async function up(schema: SchemaBuilder): Promise<void> {`)
  lines.push(`  schema.createTable('${tableName}', (table) => {`)
  lines.push(`    table.increments('id')`)
  for (const field of config.fields) {
    if (field.type === 'foreignId') {
      const ref = field.relatedModel ? `.references('id').on('${toPlural(toSnakeCase(field.relatedModel))}')` : ''
      lines.push(`    table.integer('${field.name}')${ref}`)
    } else if (field.type === 'enum' && field.enumValues) {
      lines.push(`    table.enum('${field.name}', ${JSON.stringify(field.enumValues)})`)
    } else {
      lines.push(`    table.${fieldTypeToMigration(field)}('${field.name}')`)
    }
  }
  for (const rel of config.relations) {
    if (rel.type === 'belongsTo' && rel.foreignKey) {
      const refTable = toPlural(toSnakeCase(rel.model))
      lines.push(`    table.integer('${rel.foreignKey}').references('id').on('${refTable}')`)
    }
  }
  lines.push(`    table.timestamps()`)
  lines.push(`  })`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export async function down(schema: SchemaBuilder): Promise<void> {`)
  lines.push(`  schema.dropTable('${tableName}')`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateModel(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const tableName = toPlural(toSnakeCase(config.modelName))
  const lines: string[] = []
  lines.push(`import { Model } from 'speexjs/server/database'`)
  lines.push('')
  lines.push(`export interface ${className}Fields {`)
  lines.push(`  id: number`)
  for (const field of config.fields) {
    lines.push(`  ${field.name}: ${fieldTypeToTs(field)}`)
  }
  lines.push(`  createdAt: Date`)
  lines.push(`  updatedAt: Date`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export class ${className} extends Model {`)
  lines.push(`  static table = '${tableName}'`)
  lines.push('')
  lines.push(`  id!: number`)
  for (const field of config.fields) {
    lines.push(`  ${field.name}!: ${fieldTypeToTs(field)}`)
  }
  lines.push(`  createdAt!: Date`)
  lines.push(`  updatedAt!: Date`)
  lines.push('')
  for (const rel of config.relations) {
    const relModel = toPascalCase(rel.model)
    const relVar = toCamelCase(rel.model)
    lines.push(`  ${relVar}?: ${relModel}`)
  }
  lines.push('')
  for (const rel of config.relations) {
    if (rel.type === 'belongsTo') {
      lines.push(`  static ${toCamelCase(rel.model)}() {`)
      lines.push(`    return this.belongsTo(${toPascalCase(rel.model)}, '${rel.foreignKey || `${toSnakeCase(rel.model)}_id`}')`)
      lines.push(`  }`)
      lines.push('')
    } else if (rel.type === 'hasMany') {
      lines.push(`  static ${toPlural(toCamelCase(rel.model))}() {`)
      lines.push(`    return this.hasMany(${toPascalCase(rel.model)}, '${rel.foreignKey || `${toSnakeCase(config.modelName)}_id`}')`)
      lines.push(`  }`)
      lines.push('')
    } else if (rel.type === 'belongsToMany') {
      const pivot = rel.pivotTable || [toSnakeCase(config.modelName), toSnakeCase(rel.model)].sort().join('_')
      lines.push(`  static ${toPlural(toCamelCase(rel.model))}() {`)
      lines.push(`    return this.belongsToMany(${toPascalCase(rel.model)}, '${pivot}')`)
      lines.push(`  }`)
      lines.push('')
    }
  }
  lines.push(`  static scopes = {`)
  lines.push(`    recent: (query: any) => query.orderBy('createdAt', 'desc').limit(10),`)
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function fieldTypeToSchema(field: CrudField): string {
  switch (field.type) {
    case 'string':
      return `schema.string()`
    case 'text':
      return `schema.string()`
    case 'number':
      return `schema.number()`
    case 'boolean':
      return `schema.boolean()`
    case 'date':
      return `schema.string().datetime()`
    case 'email':
      return `schema.string().email()`
    case 'url':
      return `schema.string().url()`
    case 'enum':
      return `schema.string()`
    case 'json':
      return `schema.any()`
    case 'foreignId':
      return `schema.number()`
  }
}

function generateSchema(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const schemaName = `${className}Schema`
  const createSchemaName = `create${className}Schema`
  const updateSchemaName = `update${className}Schema`

  const lines: string[] = []
  lines.push(`import { schema, type Infer } from 'speexjs/schema'`)
  lines.push('')
  lines.push(`export const ${schemaName} = schema.object({`)
  lines.push(`  id: schema.number(),`)
  for (const field of config.fields) {
    lines.push(`  ${field.name}: ${fieldTypeToSchema(field)},`)
  }
  lines.push(`  createdAt: schema.string().datetime(),`)
  lines.push(`  updatedAt: schema.string().datetime().optional(),`)
  lines.push(`})`)
  lines.push('')
  lines.push(`export type ${className} = Infer<typeof ${schemaName}>`)
  lines.push('')
  lines.push(`export const ${createSchemaName} = schema.object({`)
  for (const field of config.fields) {
    if (field.validation) {
      lines.push(`  ${field.name}: ${fieldTypeToSchema(field)}.validate('${field.validation}'),`)
    } else {
      lines.push(`  ${field.name}: ${fieldTypeToSchema(field)}.optional(),`)
    }
  }
  lines.push(`})`)
  lines.push('')
  lines.push(`export type Create${className} = Infer<typeof ${createSchemaName}>`)
  lines.push('')
  lines.push(`export const ${updateSchemaName} = schema.object({`)
  for (const field of config.fields) {
    if (field.validation) {
      lines.push(`  ${field.name}: ${fieldTypeToSchema(field)}.validate('${field.validation}').optional(),`)
    } else {
      lines.push(`  ${field.name}: ${fieldTypeToSchema(field)}.optional(),`)
    }
  }
  lines.push(`})`)
  lines.push('')
  lines.push(`export type Update${className} = Infer<typeof ${updateSchemaName}>`)
  lines.push('')
  return lines.join('\n')
}

function generateController(config: CrudConfig): string {
  const className = `${toPascalCase(config.modelName)}Controller`
  const modelName = toPascalCase(config.modelName)
  const varName = toCamelCase(config.modelName)
  const createSchemaName = `create${modelName}Schema`
  const updateSchemaName = `update${modelName}Schema`

  const lines: string[] = []
  lines.push(`import { Controller, get, post, put, del } from 'speexjs/server'`)
  lines.push(`import type { RouteContext } from 'speexjs/server/router'`)
  lines.push(`import { ${modelName} } from '#models/${toKebabCase(config.modelName)}.model'`)
  lines.push(`import { ${createSchemaName}, ${updateSchemaName} } from '#schemas/${toKebabCase(config.modelName)}.schema'`)
  lines.push('')
  lines.push(`export class ${className} extends Controller {`)
  lines.push(`  @get('/')`)
  lines.push(`  async index({ response }: RouteContext) {`)
  lines.push(`    const ${varName}s = await ${modelName}.query().orderBy('createdAt', 'desc')`)
  lines.push(`    return response.json({ data: ${varName}s })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @get('/:id')`)
  lines.push(`  async show({ response, params }: RouteContext) {`)
  lines.push(`    const ${varName} = await ${modelName}.query().where('id', Number(params.id)).first()`)
  lines.push(`    if (!${varName}) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ data: ${varName} })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @post('/')`)
  lines.push(`  async store({ request, response }: RouteContext) {`)
  lines.push(`    const body = await request.body()`)
  lines.push(`    const parsed = ${createSchemaName}.safeParse(body)`)
  lines.push(`    if (!parsed.success) {`)
  lines.push(`      return response.status(422).json({ errors: parsed.error })`)
  lines.push(`    }`)
  lines.push(`    const ${varName} = await ${modelName}.query().insert(parsed.data)`)
  lines.push(`    return response.status(201).json({ data: ${varName} })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @put('/:id')`)
  lines.push(`  async update({ request, response, params }: RouteContext) {`)
  lines.push(`    const body = await request.body()`)
  lines.push(`    const parsed = ${updateSchemaName}.safeParse(body)`)
  lines.push(`    if (!parsed.success) {`)
  lines.push(`      return response.status(422).json({ errors: parsed.error })`)
  lines.push(`    }`)
  lines.push(`    const ${varName} = await ${modelName}.query().where('id', Number(params.id)).update(parsed.data)`)
  lines.push(`    if (!${varName}) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ data: ${varName} })`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  @del('/:id')`)
  lines.push(`  async destroy({ response, params }: RouteContext) {`)
  lines.push(`    const deleted = await ${modelName}.query().where('id', Number(params.id)).delete()`)
  lines.push(`    if (!deleted) {`)
  lines.push(`      return response.status(404).json({ message: '${modelName} not found' })`)
  lines.push(`    }`)
  lines.push(`    return response.json({ message: '${modelName} deleted successfully' })`)
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export const ${varName}Controller = ${className}`)
  lines.push('')
  return lines.join('\n')
}

function generateRoutes(config: CrudConfig): string {
  const className = `${toPascalCase(config.modelName)}Controller`
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import { Router } from 'speexjs/server/router'`)
  lines.push(`import { ${className} } from '#controllers/${toKebabCase(config.modelName)}.controller'`)
  lines.push('')
  lines.push(`const router = new Router()`)
  lines.push('')
  lines.push(`router.get('/${path}', ${className}, 'index')`)
  lines.push(`router.get('/${path}/:id', ${className}, 'show')`)
  lines.push(`router.post('/${path}', ${className}, 'store')`)
  lines.push(`router.put('/${path}/:id', ${className}, 'update')`)
  lines.push(`router.delete('/${path}/:id', ${className}, 'destroy')`)
  lines.push('')
  lines.push(`export default router`)
  lines.push('')
  return lines.join('\n')
}

function generateIndexView(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const varName = toCamelCase(config.modelName)
  const plural = toPlural(varName)
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import type { VNode } from 'speexjs/client/vdom'`)
  lines.push(`import { useSignal, useComputed } from 'speexjs/client/signals'`)
  lines.push(`import { ${className}Layout } from './_layout'`)
  lines.push('')
  lines.push(`interface ${className}IndexProps {`)
  lines.push(`  ${plural}: Array<{`)
  lines.push(`    id: number`)
  for (const field of config.fields) {
    if (field.type === 'string' || field.type === 'email' || field.type === 'url' || field.type === 'enum' || field.type === 'text') {
      lines.push(`    ${field.name}: string`)
    } else if (field.type === 'number') {
      lines.push(`    ${field.name}: number`)
    } else if (field.type === 'boolean') {
      lines.push(`    ${field.name}: boolean`)
    } else if (field.type === 'date') {
      lines.push(`    ${field.name}: string`)
    } else if (field.type === 'json') {
      lines.push(`    ${field.name}: Record<string, unknown>`)
    } else if (field.type === 'foreignId') {
      lines.push(`    ${field.name}: number`)
    }
  }
  lines.push(`    createdAt: string`)
  lines.push(`  }>`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export default function ${className}Index(props: ${className}IndexProps) {`)
  lines.push(`  const ${plural} = useSignal(props.${plural})`)
  lines.push(`  const searchQuery = useSignal('')`)
  lines.push('')
  lines.push(`  const filtered${toPascalCase(toPlural(varName))} = useComputed(() => {`)
  lines.push(`    if (!searchQuery.value) return ${plural}.value`)
  const firstStringField = config.fields.find((f) => ['string', 'email', 'url', 'text'].includes(f.type))
  if (firstStringField) {
    lines.push(`    return ${plural}.value.filter(item =>`)
    lines.push(`      item.${firstStringField.name}.toLowerCase().includes(searchQuery.value.toLowerCase()),`)
    lines.push(`    )`)
  } else {
    lines.push(`    return ${plural}.value`)
  }
  lines.push(`  })`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <${className}Layout>`)
  lines.push(`      <div class="space-y-6">`)
  lines.push(`        <div class="flex items-center justify-between">`)
  lines.push(`          <h1 class="text-2xl font-bold">${toPascalCase(toPlural(varName))}</h1>`)
  lines.push(`          <a href="/${path}/create" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">`)
  lines.push(`            Create ${className}`)
  lines.push(`          </a>`)
  lines.push(`        </div>`)
  lines.push('')
  lines.push(`        <input`)
  lines.push(`          type="text"`)
  lines.push(`          placeholder="Search..."`)
  lines.push(`          value={searchQuery.value}`)
  lines.push(`          onInput={(e) => searchQuery.value = (e.target as HTMLInputElement).value}`)
  lines.push(`          class="w-full rounded border px-3 py-2"`)
  lines.push(`        />`)
  lines.push('')
  lines.push(`        <div class="overflow-x-auto rounded-lg border">`)
  lines.push(`          <table class="min-w-full divide-y divide-gray-200">`)
  lines.push(`            <thead class="bg-gray-50">`)
  lines.push(`              <tr>`)
  const displayFields = config.fields.slice(0, 5)
  for (const field of displayFields) {
    lines.push(`                <th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">${field.name}</th>`)
  }
  lines.push(`                <th class="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>`)
  lines.push(`              </tr>`)
  lines.push(`            </thead>`)
  lines.push(`            <tbody class="divide-y divide-gray-200 bg-white">`)
  lines.push(`              {filtered${toPascalCase(toPlural(varName))}.value.map(${varName} => (`)
  lines.push(`                <tr class="hover:bg-gray-50">`)
  for (const field of displayFields) {
    if (field.type === 'boolean') {
      lines.push(`                  <td class="px-4 py-3">`)
      lines.push(`                    <span class={${varName}.${field.name} ? 'text-green-600' : 'text-red-600'}>`)
      lines.push(`                      {${varName}.${field.name} ? 'Yes' : 'No'}`)
      lines.push(`                    </span>`)
      lines.push(`                  </td>`)
    } else {
      lines.push(`                  <td class="px-4 py-3 text-sm">{String(${varName}.${field.name})}</td>`)
    }
  }
  lines.push(`                  <td class="px-4 py-3 text-right">`)
  lines.push(`                    <a href="/${path}/{${varName}.id}" class="mr-2 text-blue-600 hover:underline">View</a>`)
  lines.push(`                    <a href="/${path}/{${varName}.id}/edit" class="text-indigo-600 hover:underline">Edit</a>`)
  lines.push(`                  </td>`)
  lines.push(`                </tr>`)
  lines.push(`              ))}`)
  lines.push(`            </tbody>`)
  lines.push(`          </table>`)
  lines.push(`        </div>`)
  lines.push(`      </div>`)
  lines.push(`    </${className}Layout>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateShowView(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const varName = toCamelCase(config.modelName)
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import type { VNode } from 'speexjs/client/vdom'`)
  lines.push(`import { ${className}Layout } from './_layout'`)
  lines.push('')
  lines.push(`interface ${className}ShowProps {`)
  lines.push(`  ${varName}: {`)
  lines.push(`    id: number`)
  for (const field of config.fields) {
    if (field.type === 'json') {
      lines.push(`    ${field.name}: Record<string, unknown>`)
    } else if (field.type === 'date') {
      lines.push(`    ${field.name}: string`)
    } else if (field.type === 'boolean') {
      lines.push(`    ${field.name}: boolean`)
    } else if (field.type === 'number' || field.type === 'foreignId') {
      lines.push(`    ${field.name}: number`)
    } else {
      lines.push(`    ${field.name}: string`)
    }
  }
  lines.push(`    createdAt: string`)
  lines.push(`    updatedAt: string`)
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export default function ${className}Show(props: ${className}ShowProps) {`)
  lines.push(`  const ${varName} = props.${varName}`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <${className}Layout>`)
  lines.push(`      <div class="space-y-6">`)
  lines.push(`        <div class="flex items-center justify-between">`)
  lines.push(`          <h1 class="text-2xl font-bold">${className} Details</h1>`)
  lines.push(`          <div class="space-x-2">`)
  lines.push(`            <a href="/${path}" class="rounded border px-4 py-2 hover:bg-gray-50">Back</a>`)
  lines.push(
    `            <a href="/${path}/{${varName}.id}/edit" class="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700">Edit</a>`,
  )
  lines.push(`          </div>`)
  lines.push(`        </div>`)
  lines.push('')
  lines.push(`        <div class="rounded-lg border bg-white">`)
  lines.push(`          <dl class="divide-y">`)
  const allFields = [
    { name: 'id', type: 'number', validation: '' },
    ...config.fields,
    { name: 'createdAt', type: 'date', validation: '' },
    { name: 'updatedAt', type: 'date', validation: '' },
  ]
  for (const field of allFields) {
    lines.push(`            <div class="px-6 py-4 sm:grid sm:grid-cols-3 sm:gap-4">`)
    lines.push(`              <dt class="text-sm font-medium text-gray-500">${field.name}</dt>`)
    lines.push(`              <dd class="mt-1 text-sm sm:col-span-2 sm:mt-0">{String(${varName}.${field.name})}</dd>`)
    lines.push(`            </div>`)
  }
  lines.push(`          </dl>`)
  lines.push(`        </div>`)
  lines.push(`      </div>`)
  lines.push(`    </${className}Layout>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateCreateView(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import type { VNode } from 'speexjs/client/vdom'`)
  lines.push(`import { useSignal } from 'speexjs/client/signals'`)
  lines.push(`import { ${className}Layout } from './_layout'`)
  lines.push('')
  lines.push(`export default function ${className}Create() {`)
  lines.push(`  const errors = useSignal<Record<string, string[]>>({})`)
  lines.push(`  const submitting = useSignal(false)`)
  lines.push('')
  for (const field of config.fields) {
    lines.push(`  const ${field.name} = useSignal('')`)
  }
  lines.push('')
  lines.push(`  async function handleSubmit(e: Event) {`)
  lines.push(`    e.preventDefault()`)
  lines.push(`    submitting.value = true`)
  lines.push(`    errors.value = {}`)
  lines.push('')
  lines.push(`    try {`)
  const bodyFields = config.fields
    .map((f) => {
      if (f.type === 'number' || f.type === 'foreignId') {
        return `      ${f.name}: Number(${f.name}.value),`
      } else if (f.type === 'boolean') {
        return `      ${f.name}: ${f.name}.value === 'true',`
      } else {
        return `      ${f.name}: ${f.name}.value,`
      }
    })
    .join('\n')
  lines.push(`      const res = await fetch('/${path}', {`)
  lines.push(`        method: 'POST',`)
  lines.push(`        headers: { 'Content-Type': 'application/json' },`)
  lines.push(`        body: JSON.stringify({`)
  lines.push(bodyFields)
  lines.push(`        }),`)
  lines.push(`      })`)
  lines.push('')
  lines.push(`      if (!res.ok) {`)
  lines.push(`        const data = await res.json()`)
  lines.push(`        errors.value = data.errors ?? {}`)
  lines.push(`        return`)
  lines.push(`      }`)
  lines.push('')
  lines.push(`      window.location.href = '/${path}'`)
  lines.push(`    } finally {`)
  lines.push(`      submitting.value = false`)
  lines.push(`    }`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <${className}Layout>`)
  lines.push(`      <div class="mx-auto max-w-2xl space-y-6">`)
  lines.push(`        <div class="flex items-center justify-between">`)
  lines.push(`          <h1 class="text-2xl font-bold">Create ${className}</h1>`)
  lines.push(`          <a href="/${path}" class="rounded border px-4 py-2 hover:bg-gray-50">Back</a>`)
  lines.push(`        </div>`)
  lines.push('')
  lines.push(`        <form onSubmit={handleSubmit} class="space-y-4 rounded-lg border bg-white p-6">`)
  for (const field of config.fields) {
    lines.push(`          <div>`)
    lines.push(`            <label class="mb-1 block text-sm font-medium text-gray-700">${field.name}</label>`)
    if (field.type === 'text') {
      lines.push(`            <textarea`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLTextAreaElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`              rows={4}`)
      lines.push(`            />`)
    } else if (field.type === 'boolean') {
      lines.push(`            <select`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onChange={(e) => ${field.name}.value = (e.target as HTMLSelectElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            >`)
      lines.push(`              <option value="">Select...</option>`)
      lines.push(`              <option value="true">Yes</option>`)
      lines.push(`              <option value="false">No</option>`)
      lines.push(`            </select>`)
    } else if (field.type === 'enum' && field.enumValues) {
      lines.push(`            <select`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onChange={(e) => ${field.name}.value = (e.target as HTMLSelectElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            >`)
      lines.push(`              <option value="">Select...</option>`)
      for (const val of field.enumValues) {
        lines.push(`              <option value="${val}">${val}</option>`)
      }
      lines.push(`            </select>`)
    } else if (field.type === 'foreignId') {
      lines.push(`            <input`)
      lines.push(`              type="number"`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLInputElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            />`)
    } else {
      lines.push(`            <input`)
      lines.push(
        `              type="${field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'date' ? 'datetime-local' : 'text'}"`,
      )
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLInputElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            />`)
    }
    lines.push(`            {errors.value.${field.name} && (`)
    lines.push(`              <p class="mt-1 text-sm text-red-600">{errors.value.${field.name}.join(', ')}</p>`)
    lines.push(`            )}`)
    lines.push(`          </div>`)
  }
  lines.push('')
  lines.push(`          <div class="flex justify-end">`)
  lines.push(`            <button`)
  lines.push(`              type="submit"`)
  lines.push(`              disabled={submitting.value}`)
  lines.push(`              class="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50">`)
  lines.push(`              {submitting.value ? 'Creating...' : 'Create ${className}'}`)
  lines.push(`            </button>`)
  lines.push(`          </div>`)
  lines.push(`        </form>`)
  lines.push(`      </div>`)
  lines.push(`    </${className}Layout>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateEditView(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const varName = toCamelCase(config.modelName)
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import type { VNode } from 'speexjs/client/vdom'`)
  lines.push(`import { useSignal } from 'speexjs/client/signals'`)
  lines.push(`import { ${className}Layout } from './_layout'`)
  lines.push('')
  lines.push(`interface ${className}EditProps {`)
  lines.push(`  ${varName}: {`)
  lines.push(`    id: number`)
  for (const field of config.fields) {
    lines.push(`    ${field.name}: ${fieldTypeToTs(field)}`)
  }
  lines.push(`  }`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export default function ${className}Edit(props: ${className}EditProps) {`)
  lines.push(`  const errors = useSignal<Record<string, string[]>>({})`)
  lines.push(`  const submitting = useSignal(false)`)
  lines.push('')
  for (const field of config.fields) {
    lines.push(`  const ${field.name} = useSignal(String(props.${varName}.${field.name} ?? ''))`)
  }
  lines.push('')
  lines.push(`  async function handleSubmit(e: Event) {`)
  lines.push(`    e.preventDefault()`)
  lines.push(`    submitting.value = true`)
  lines.push(`    errors.value = {}`)
  lines.push('')
  lines.push(`    try {`)
  const bodyFields = config.fields
    .map((f) => {
      if (f.type === 'number' || f.type === 'foreignId') {
        return `      ${f.name}: Number(${f.name}.value),`
      } else if (f.type === 'boolean') {
        return `      ${f.name}: ${f.name}.value === 'true',`
      } else {
        return `      ${f.name}: ${f.name}.value,`
      }
    })
    .join('\n')
  lines.push(`      const res = await fetch('/${path}/{props.${varName}.id}', {`)
  lines.push(`        method: 'PUT',`)
  lines.push(`        headers: { 'Content-Type': 'application/json' },`)
  lines.push(`        body: JSON.stringify({`)
  lines.push(bodyFields)
  lines.push(`        }),`)
  lines.push(`      })`)
  lines.push('')
  lines.push(`      if (!res.ok) {`)
  lines.push(`        const data = await res.json()`)
  lines.push(`        errors.value = data.errors ?? {}`)
  lines.push(`        return`)
  lines.push(`      }`)
  lines.push('')
  lines.push(`      window.location.href = '/${path}'`)
  lines.push(`    } finally {`)
  lines.push(`      submitting.value = false`)
  lines.push(`    }`)
  lines.push(`  }`)
  lines.push('')
  lines.push(`  return (`)
  lines.push(`    <${className}Layout>`)
  lines.push(`      <div class="mx-auto max-w-2xl space-y-6">`)
  lines.push(`        <div class="flex items-center justify-between">`)
  lines.push(`          <h1 class="text-2xl font-bold">Edit ${className}</h1>`)
  lines.push(`          <a href="/${path}" class="rounded border px-4 py-2 hover:bg-gray-50">Back</a>`)
  lines.push(`        </div>`)
  lines.push('')
  lines.push(`        <form onSubmit={handleSubmit} class="space-y-4 rounded-lg border bg-white p-6">`)
  for (const field of config.fields) {
    lines.push(`          <div>`)
    lines.push(`            <label class="mb-1 block text-sm font-medium text-gray-700">${field.name}</label>`)
    if (field.type === 'text') {
      lines.push(`            <textarea`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLTextAreaElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`              rows={4}`)
      lines.push(`            />`)
    } else if (field.type === 'boolean') {
      lines.push(`            <select`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onChange={(e) => ${field.name}.value = (e.target as HTMLSelectElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            >`)
      lines.push(`              <option value="true">Yes</option>`)
      lines.push(`              <option value="false">No</option>`)
      lines.push(`            </select>`)
    } else if (field.type === 'enum' && field.enumValues) {
      lines.push(`            <select`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onChange={(e) => ${field.name}.value = (e.target as HTMLSelectElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            >`)
      for (const val of field.enumValues) {
        lines.push(`              <option value="${val}">${val}</option>`)
      }
      lines.push(`            </select>`)
    } else if (field.type === 'foreignId') {
      lines.push(`            <input`)
      lines.push(`              type="number"`)
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLInputElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            />`)
    } else {
      lines.push(`            <input`)
      lines.push(
        `              type="${field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : field.type === 'date' ? 'datetime-local' : 'text'}"`,
      )
      lines.push(`              value={${field.name}.value}`)
      lines.push(`              onInput={(e) => ${field.name}.value = (e.target as HTMLInputElement).value}`)
      lines.push(`              class="w-full rounded border px-3 py-2"`)
      lines.push(`            />`)
    }
    lines.push(`            {errors.value.${field.name} && (`)
    lines.push(`              <p class="mt-1 text-sm text-red-600">{errors.value.${field.name}.join(', ')}</p>`)
    lines.push(`            )}`)
    lines.push(`          </div>`)
  }
  lines.push('')
  lines.push(`          <div class="flex justify-end">`)
  lines.push(`            <button`)
  lines.push(`              type="submit"`)
  lines.push(`              disabled={submitting.value}`)
  lines.push(`              class="rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50">`)
  lines.push(`              {submitting.value ? 'Updating...' : 'Update ${className}'}`)
  lines.push(`            </button>`)
  lines.push(`          </div>`)
  lines.push(`        </form>`)
  lines.push(`      </div>`)
  lines.push(`    </${className}Layout>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function generateLayoutView(config: CrudConfig): string {
  const className = toPascalCase(config.modelName)
  const path = toKebabCase(toPlural(config.modelName))

  const lines: string[] = []
  lines.push(`import type { VNode } from 'speexjs/client/vdom'`)
  lines.push('')
  lines.push(`interface ${className}LayoutProps {`)
  lines.push(`  children?: VNode | VNode[]`)
  lines.push(`}`)
  lines.push('')
  lines.push(`export function ${className}Layout(props: ${className}LayoutProps) {`)
  lines.push(`  return (`)
  lines.push(`    <div class="min-h-screen bg-gray-50">`)
  lines.push(`      <nav class="border-b bg-white shadow-sm">`)
  lines.push(`        <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">`)
  lines.push(`          <a href="/${path}" class="text-lg font-semibold">${className}</a>`)
  lines.push(`          <div class="space-x-4">`)
  lines.push(`            <a href="/${path}" class="text-sm text-gray-600 hover:text-gray-900">List</a>`)
  lines.push(`            <a href="/${path}/create" class="text-sm text-gray-600 hover:text-gray-900">Create</a>`)
  lines.push(`          </div>`)
  lines.push(`        </div>`)
  lines.push(`      </nav>`)
  lines.push(`      <main class="mx-auto max-w-7xl px-4 py-8">`)
  lines.push(`        {props.children}`)
  lines.push(`      </main>`)
  lines.push(`    </div>`)
  lines.push(`  )`)
  lines.push(`}`)
  lines.push('')
  return lines.join('\n')
}

function rlQuestion(rl: any, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

function promptForEnumValues(rl: any): Promise<string[]> {
  return new Promise(async (resolve) => {
    console.log(`  ${colors.cyan('Enter enum values (comma-separated):')}`)
    const answer = await rlQuestion(rl, `  ${colors.gray('>')} `)
    resolve(
      answer
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
  })
}

function promptForRelation(rl: any, availableTypes: RelationType[]): Promise<CrudRelation | null> {
  return new Promise(async (resolve) => {
    const typeStr = await rlQuestion(rl, `  ${colors.cyan(`Relation type (${availableTypes.join('/')})`)}: `)
    const type = typeStr.trim().toLowerCase() as RelationType
    if (!availableTypes.includes(type)) {
      console.log(`  ${colors.red(`Invalid relation type. Choose: ${availableTypes.join(', ')}`)}`)
      resolve(null)
      return
    }
    const model = await rlQuestion(rl, `  ${colors.cyan('Related model name:')} `)
    if (!model.trim()) {
      resolve(null)
      return
    }
    const fk = await rlQuestion(rl, `  ${colors.cyan('Foreign key (optional):')} `)
    const lk = await rlQuestion(rl, `  ${colors.cyan('Local key (optional):')} `)
    const pivot = type === 'belongsToMany' ? await rlQuestion(rl, `  ${colors.cyan('Pivot table (optional):')} `) : ''

    const config: CrudRelation = {
      type,
      model: toPascalCase(model.trim()),
      foreignKey: fk.trim() || undefined,
      localKey: lk.trim() || undefined,
      pivotTable: pivot.trim() || undefined,
    }
    resolve(config)
  })
}

function createFiles(config: CrudConfig): void {
  const cwd = process.cwd()
  const migrationsDir = resolve(cwd, 'src/database/migrations')
  const modelsDir = resolve(cwd, 'src/models')
  const controllersDir = resolve(cwd, 'src/server/controllers')
  const schemasDir = resolve(cwd, 'src/schemas')
  const routesDir = resolve(cwd, 'src/routes')
  const pagesDir = resolve(cwd, 'src/pages')

  const modelNameSnake = toSnakeCase(config.modelName)
  const modelNameKebab = toKebabCase(config.modelName)

  const files: Array<{ path: string; content: string; label: string }> = [
    {
      path: resolve(migrationsDir, `${timestamp()}_create_${toPlural(modelNameSnake)}_table.ts`),
      content: generateMigration(config),
      label: `Migration: ${modelNameSnake}`,
    },
    {
      path: resolve(modelsDir, `${modelNameKebab}.model.ts`),
      content: generateModel(config),
      label: `Model: ${toPascalCase(config.modelName)}`,
    },
    {
      path: resolve(controllersDir, `${modelNameKebab}.controller.ts`),
      content: generateController(config),
      label: `Controller: ${toPascalCase(config.modelName)}Controller`,
    },
    {
      path: resolve(schemasDir, `${modelNameKebab}.schema.ts`),
      content: generateSchema(config),
      label: `Schema: ${toPascalCase(config.modelName)}Schema`,
    },
    {
      path: resolve(routesDir, `${modelNameKebab}.ts`),
      content: generateRoutes(config),
      label: `Routes: ${modelNameKebab}`,
    },
  ]

  if (config.generateViews) {
    const pagesModelDir = resolve(pagesDir, modelNameKebab)
    files.push(
      {
        path: resolve(pagesModelDir, 'index.tsx'),
        content: generateIndexView(config),
        label: 'View: index',
      },
      {
        path: resolve(pagesModelDir, 'create.tsx'),
        content: generateCreateView(config),
        label: 'View: create',
      },
      {
        path: resolve(pagesModelDir, '[id]', 'edit.tsx'),
        content: generateEditView(config),
        label: 'View: edit',
      },
      {
        path: resolve(pagesModelDir, '[id]', 'show.tsx'),
        content: generateShowView(config),
        label: 'View: show',
      },
      {
        path: resolve(pagesModelDir, '_layout.tsx'),
        content: generateLayoutView(config),
        label: 'View: layout',
      },
    )
  }

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
  console.log(`  ${colors.green('✅')} CRUD scaffold for ${colors.bold(toPascalCase(config.modelName))} complete!`)
  console.log(`  ${colors.cyan('→')} Register routes in your router file: import '${modelNameKebab}' from '#routes/${modelNameKebab}'`)
}

export async function makeCrud(): Promise<void> {
  console.log(`\n  ${colors.bold('SpeexJS CRUD Scaffolder')}`)
  console.log(`  ${colors.gray('Generate a complete CRUD from schema definition')}\n`)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const rlQ = (query: string) => rlQuestion(rl, `  ${colors.cyan('?')} ${query}`)

  try {
    const modelName = await rlQ(`${colors.bold('Model name')}: `)
    if (!modelName.trim()) {
      console.log(`  ${colors.red('Model name is required')}`)
      return
    }

    const fields: CrudField[] = []

    while (true) {
      const addField = await rlQ(`${colors.bold(`Add field: name (type)`)} [y/N]: `)
      if (addField.toLowerCase() !== 'y' && addField.toLowerCase() !== 'yes') break

      const name = await rlQ(`  ${colors.gray('Field name')}: `)
      if (!name.trim()) break

      const type = await rlQ(`  ${colors.gray(`Type (string/text/number/boolean/date/email/url/enum/json/foreignId)`)}: `)
      const fieldType = type.trim().toLowerCase() as FieldType

      const field: CrudField = {
        name: name.trim(),
        type: fieldType,
        validation: '',
      }

      if (fieldType === 'foreignId') {
        const related = await rlQ(`  ${colors.gray('Related model')}: `)
        field.relatedModel = toPascalCase(related.trim())
      }

      if (fieldType === 'enum') {
        field.enumValues = await promptForEnumValues(rl)
      }

      const validation = await rlQ(`  ${colors.gray('Validation rules (e.g., required|min:3|max:255)')}: `)
      field.validation = validation.trim()

      fields.push(field)
    }

    const relations: CrudRelation[] = []

    while (true) {
      const addRelation = await rlQ(`${colors.bold('Add relation (belongsTo/hasMany/belongsToMany)')} [y/N]: `)
      if (addRelation.toLowerCase() !== 'y' && addRelation.toLowerCase() !== 'yes') break

      const relation = await promptForRelation(rl, ['belongsTo', 'hasMany', 'belongsToMany'])
      if (relation) {
        relations.push(relation)
      }
    }

    const genViews = await rlQ(`${colors.bold('Generate views')} [y/N]: `)
    const generateViews = genViews.toLowerCase() === 'y' || genViews.toLowerCase() === 'yes'

    const config: CrudConfig = {
      modelName: modelName.trim(),
      fields,
      relations,
      generateViews,
    }

    console.log()
    createFiles(config)
  } finally {
    rl.close()
  }
}
