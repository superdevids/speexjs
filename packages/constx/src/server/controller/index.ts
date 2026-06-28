import type { RouteContext } from '../router'
import type { Container } from '../container'
import type { SuperRequest } from '../http/request'
import type { SuperResponse } from '../http/response'
import type { Schema } from '../http/request'
import { HttpStatus } from '../http/status'

export interface ControllerRouteDefinition {
  method: string
  path: string
  handler: string | symbol
}

const controllerPrefixMap = new WeakMap<object, string>()
const controllerRoutesMap = new WeakMap<object, ControllerRouteDefinition[]>()

export abstract class Controller {
  declare protected __ctx: RouteContext
  declare protected __container: Container

  protected get request(): SuperRequest {
    return this.__ctx.request
  }

  protected get response(): SuperResponse {
    return this.__ctx.response
  }

  protected get container(): Container {
    return this.__container
  }

  protected async validate<T>(schema: Schema<T>): Promise<T> {
    return this.request.validate(schema)
  }

  protected ok<T>(data: T): void {
    this.response.json(data, HttpStatus.OK)
  }

  protected created<T>(data: T): void {
    this.response.json(data, HttpStatus.CREATED)
  }

  protected noContent(): void {
    this.response.status(HttpStatus.NO_CONTENT)
  }

  protected badRequest(message?: string): void {
    this.response.status(HttpStatus.BAD_REQUEST).json({
      error: 'Bad Request',
      message: message ?? 'The request could not be processed',
    })
  }

  protected notFound(message?: string): void {
    this.response.status(HttpStatus.NOT_FOUND).json({
      error: 'Not Found',
      message: message ?? 'The requested resource was not found',
    })
  }

  protected unauthorized(message?: string): void {
    this.response.status(HttpStatus.UNAUTHORIZED).json({
      error: 'Unauthorized',
      message: message ?? 'Authentication is required',
    })
  }

  protected forbidden(message?: string): void {
    this.response.status(HttpStatus.FORBIDDEN).json({
      error: 'Forbidden',
      message: message ?? 'You do not have permission to access this resource',
    })
  }

  protected error(status: number, message?: string): void {
    this.response.status(status).json({
      error: getStatusKey(status),
      message: message ?? 'An error occurred',
    })
  }
}

function getStatusKey(code: number): string {
  for (const [key, val] of Object.entries(HttpStatus)) {
    if (val === code) return key
  }
  return 'Error'
}

function createRouteDecorator(method: string) {
  return (path: string) => {
    return (target: unknown, context: ClassMethodDecoratorContext): void => {
      const classTarget = context.static
        ? (target as object)
        : ((target as { constructor: object }).constructor)

      const routes = controllerRoutesMap.get(classTarget) ?? []
      routes.push({ method, path, handler: context.name })
      controllerRoutesMap.set(classTarget, routes)
    }
  }
}

export function controller(prefix?: string): ClassDecorator {
  return (target: unknown, _context?: ClassDecoratorContext): void => {
    controllerPrefixMap.set(target as object, prefix ?? '')
  }
}

export const get = createRouteDecorator('GET')
export const post = createRouteDecorator('POST')
export const put = createRouteDecorator('PUT')
export const patch = createRouteDecorator('PATCH')
export const del = createRouteDecorator('DELETE')

export function getControllerPrefix(controllerClass: object): string {
  return controllerPrefixMap.get(controllerClass) ?? ''
}

export function getControllerRoutes(
  controllerClass: object,
): ControllerRouteDefinition[] {
  return controllerRoutesMap.get(controllerClass) ?? []
}
