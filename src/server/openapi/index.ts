import type { Router } from '../router/index.js'
import { Schema, OptionalSchema } from '../../schema/types.js'

interface RouteInfo {
  methods: string[]
  path: string
  handler?: Function
  middleware?: any[]
  deprecated?: boolean
  deprecationMessage?: string
  sunset?: string
  migration?: string
}

interface ServerObject {
  url: string
  description?: string
}

interface OpenApiConfig {
  title?: string
  version?: string
  description?: string
  servers?: ServerObject[]
  webhooks?: Record<string, WebhookObject>
  securitySchemes?: Record<string, SecuritySchemeObject>
}

interface WebhookObject {
  post?: {
    summary?: string
    description?: string
    requestBody?: RequestBodyObject
    responses: Record<string, ResponseObject>
  }
}

interface SecuritySchemeObject {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
  description?: string
  scheme?: string
  bearerFormat?: string
  in?: 'query' | 'header' | 'cookie'
  name?: string
  flows?: OAuthFlowsObject
  openIdConnectUrl?: string
}

interface OAuthFlowsObject {
  implicit?: OAuthFlowObject
  password?: OAuthFlowObject
  clientCredentials?: OAuthFlowObject
  authorizationCode?: OAuthFlowObject
}

interface OAuthFlowObject {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

interface RequestBodyObject {
  description?: string
  required?: boolean
  content: Record<string, MediaTypeObject>
}

interface ResponseObject {
  description: string
  content?: Record<string, MediaTypeObject>
}

interface MediaTypeObject {
  schema?: Record<string, unknown>
  example?: unknown
  examples?: Record<string, { value: unknown; summary?: string }>
}

interface ParameterObject {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  description?: string
  schema?: Record<string, unknown>
  example?: unknown
}

function schemaToJsonSchema(schema?: Schema<unknown>): Record<string, unknown> | undefined {
  if (!schema) return undefined
  const anySchema = schema as any
  if (anySchema.shape) {
    const properties: Record<string, unknown> = {}
    const required: string[] = []
    for (const [key, val] of Object.entries(anySchema.shape)) {
      const sub = schemaToJsonSchema(val as Schema<unknown>)
      if (sub) {
        properties[key] = sub
        if (!(val instanceof OptionalSchema || val?.constructor?.name === 'OptionalSchema')) {
          required.push(key)
        }
      }
    }
    return {
      type: 'object',
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: anySchema.isStrictMode ? false : undefined,
    }
  }
  if (anySchema instanceof Schema) {
    const name = anySchema.constructor?.name
    if (name === 'StringSchema' || name?.startsWith('String')) return { type: 'string' }
    if (name === 'NumberSchema' || name?.startsWith('Number')) return { type: 'number' }
    if (name === 'BooleanSchema' || name?.startsWith('Boolean')) return { type: 'boolean' }
    if (name === 'ArraySchema') {
      const anySchemaAny = anySchema as any
      return { type: 'array', items: schemaToJsonSchema(anySchemaAny.itemSchema) ?? {} }
    }
    if (name === 'EnumSchema') {
      const anySchemaAny = anySchema as any
      return { type: 'string', enum: [...(anySchemaAny.values ?? [])] }
    }
    if (name === 'DateSchema') return { type: 'string', format: 'date-time' }
    if (name === 'LiteralSchema') {
      const anySchemaAny = anySchema as any
      const type = typeof anySchemaAny.expected
      if (anySchemaAny.expected === null) return { enum: [null] }
      if (type === 'undefined') return {}
      return { type, enum: [anySchemaAny.expected] }
    }
    if (name === 'AnySchema' || name === 'UnknownSchema') return {}
    if (name === 'NullableSchema') {
      const base = schemaToJsonSchema((anySchema as any).inner)
      return base ? { ...base, nullable: true } : { nullable: true }
    }
    if (name === 'OptionalSchema') {
      const base = schemaToJsonSchema((anySchema as any).inner)
      return base ?? {}
    }
    if (name === 'DefaultSchema') {
      const base = schemaToJsonSchema((anySchema as any).inner)
      const defaultVal = (anySchema as any).defaultValue
      if (base) {
        return { ...base, default: defaultVal }
      }
      return { default: defaultVal }
    }
    if (name === 'UnionSchema') {
      return schemaToOpenApi(anySchema)
    }
    if (name === 'DiscriminatedUnionSchema') {
      return schemaToOpenApi(anySchema)
    }
    if (name === 'IntersectionSchema') {
      return schemaToOpenApi(anySchema)
    }
  }
  return undefined
}

function schemaToOpenApi(schema: any): Record<string, any> {
  if (schema._type === 'union' || schema._type === 'discriminatedUnion') {
    return {
      oneOf: (schema._options || []).map((opt: any) => schemaToJsonSchema(opt)),
      discriminator: schema._discriminator ? {
        propertyName: schema._discriminator,
        mapping: schema._mapping || {},
      } : undefined,
    }
  }

  const name = schema.constructor?.name

  if (name === 'UnionSchema') {
    const items = (schema.schemas || []).map((s: any) => schemaToJsonSchema(s)).filter(Boolean)
    return items.length > 0 ? { oneOf: items } : {}
  }

  if (name === 'DiscriminatedUnionSchema') {
    const mapEntries = Object.entries(schema.schemasMap || {}) as [string, any][]
    const oneOf = mapEntries.map(([, s]) => schemaToJsonSchema(s)).filter(Boolean)
    const result: Record<string, any> = oneOf.length > 0 ? { oneOf } : {}
    if (schema.key) {
      result.discriminator = {
        propertyName: schema.key,
        mapping: Object.fromEntries(
          mapEntries.map(([k]) => [k, `#/components/schemas/${k}`]),
        ),
      }
    }
    return result
  }

  if (name === 'IntersectionSchema') {
    const schemas = [schema.left, schema.right].map((s: any) => schemaToJsonSchema(s)).filter(Boolean)
    return schemas.length > 0 ? { allOf: schemas } : {}
  }

  if (name === 'DefaultSchema') {
    return schemaToJsonSchema(schema.inner) ?? {}
  }

  return schemaToJsonSchema(schema) ?? {}
}

function extractExampleFromSchema(schema?: Schema<unknown>): unknown {
  if (!schema) return undefined
  const anySchema = schema as any
  if (anySchema.shape) {
    const obj: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(anySchema.shape)) {
      obj[key] = extractExampleFromSchema(val as Schema<unknown>)
    }
    return obj
  }
  const name = anySchema.constructor?.name
  if (name === 'StringSchema' || name?.startsWith('String')) return 'string'
  if (name === 'NumberSchema' || name?.startsWith('Number')) return 0
  if (name === 'BooleanSchema' || name?.startsWith('Boolean')) return true
  if (name === 'ArraySchema') return [extractExampleFromSchema(anySchema.itemSchema)]
  if (name === 'DateSchema') return new Date().toISOString()
  if (name === 'EnumSchema') return anySchema.values?.[0] ?? 'value'
  if (name === 'LiteralSchema') return anySchema.expected
  return undefined
}

function generateResponseExamples(schema?: Schema<unknown>): Record<string, MediaTypeObject> {
  const jsonSchema = schemaToJsonSchema(schema)
  const example = extractExampleFromSchema(schema)
  const result: MediaTypeObject = {}
  if (jsonSchema) result.schema = jsonSchema
  if (example !== undefined) {
    result.example = example
    result.examples = {
      default: { value: example, summary: 'Default response' },
    }
  }
  return { 'application/json': result }
}

const DEFAULT_SECURITY_SCHEMES: Record<string, SecuritySchemeObject> = {
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT Bearer token authentication',
  },
  apiKeyAuth: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key',
    description: 'API Key authentication',
  },
}

export function generateOpenApiSpec(router: Router, config: OpenApiConfig = {}): Record<string, unknown> {
  const routes = ((router as unknown as Record<string, unknown>).routes as RouteInfo[]) ?? []

  const paths: Record<string, Record<string, unknown>> = {}
  for (const route of routes) {
    for (const method of route.methods) {
      const m = method.toLowerCase()
      if (!paths[route.path]) paths[route.path] = {}
      const entry = paths[route.path]!

      const metadata = extractRouteMetadata(route.handler)

      const parameters: ParameterObject[] = extractParams(route.path)
      if (metadata.queryParams) {
        for (const qp of metadata.queryParams) {
          parameters.push({
            name: qp.name,
            in: 'query',
            required: qp.required ?? false,
            schema: qp.schema ? schemaToJsonSchema(qp.schema) : { type: 'string' },
          })
        }
      }

      const deprecationParts: string[] = []
      if (route.deprecated) {
        deprecationParts.push('This endpoint is deprecated.')
      }
      if (route.sunset) {
        deprecationParts.push(`Sunset date: ${route.sunset}.`)
      }
      if (route.migration) {
        deprecationParts.push(`Migration path: ${route.migration}.`)
      }
      if (route.deprecationMessage) {
        deprecationParts.push(route.deprecationMessage)
      }
      const deprecationSuffix = deprecationParts.length > 0 ? `\n\n> **Deprecation Notice**\n> ${deprecationParts.join(' ')}` : ''

      const operation: Record<string, unknown> = {
        summary: metadata.summary ?? `Route ${method} ${route.path}`,
        description: (metadata.description ?? '') + deprecationSuffix,
        operationId: metadata.operationId ?? `${m}${route.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
        deprecated: route.deprecated ? true : undefined,
        parameters: parameters.length > 0 ? parameters : undefined,
        responses: {
          '200': {
            description: 'Successful response',
            ...(metadata.responseSchema
              ? generateResponseExamples(metadata.responseSchema)
              : { content: { 'application/json': { schema: {} } } }),
          },
          '400': { description: 'Bad request' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Internal server error' },
        },
      }

      if (metadata.security) {
        operation.security = metadata.security
      }

      if (metadata.requestSchema) {
        const jsonSchema = schemaToJsonSchema(metadata.requestSchema)
        const example = extractExampleFromSchema(metadata.requestSchema)
        const bodyContent: Record<string, unknown> = {}
        if (jsonSchema) bodyContent.schema = jsonSchema
        if (example !== undefined) {
          bodyContent.example = example
          bodyContent.examples = {
            default: { value: example, summary: 'Example request body' },
          }
        }
        operation.requestBody = {
          required: true,
          content: { 'application/json': bodyContent },
        }
      }

      entry[m] = operation
    }
  }

  const spec: Record<string, unknown> = {
    openapi: '3.1.0',
    info: {
      title: config.title ?? 'SpeexJS API',
      version: config.version ?? '1.0.0',
      description: config.description ?? '',
      'x-speexjs-generated': true,
    },
    jsonSchemaDialect: 'https://spec.openapis.org/oas/3.1/dialect/base',
    servers: config.servers ?? [{ url: 'http://localhost:3000' }],
    paths,
  }

  if (config.webhooks && Object.keys(config.webhooks).length > 0) {
    spec.webhooks = config.webhooks
  }

  const allSecuritySchemes = { ...DEFAULT_SECURITY_SCHEMES, ...config.securitySchemes }
  if (Object.keys(allSecuritySchemes).length > 0) {
    spec.components = {
      securitySchemes: allSecuritySchemes,
    }
    spec.security = [{ bearerAuth: [] }]
  }

  return spec
}

function extractParams(path: string): ParameterObject[] {
  const params: ParameterObject[] = []
  const matches = path.match(/:(\w+)/g)
  if (matches) {
    for (const m of matches) {
      params.push({
        name: m.slice(1),
        in: 'path',
        required: true,
        schema: { type: 'string' },
      })
    }
  }
  return params
}

interface RouteMetadata {
  summary?: string
  description?: string
  operationId?: string
  requestSchema?: Schema<unknown>
  responseSchema?: Schema<unknown>
  queryParams?: { name: string; required?: boolean; schema?: Schema<unknown> }[]
  security?: Record<string, string[]>[]
}

function extractRouteMetadata(handler?: Function): RouteMetadata {
  if (!handler) return {}
  const fnStr = handler.toString()
  const metadata: RouteMetadata = {}

  const summaryMatch = fnStr.match(/@summary\s+([^\n]+)/)
  if (summaryMatch) metadata.summary = summaryMatch[1]!.trim()

  const descMatch = fnStr.match(/@description\s+([^\n]+)/)
  if (descMatch) metadata.description = descMatch[1]!.trim()

  return metadata
}
