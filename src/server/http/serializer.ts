import type { SuperResponse } from './response.js'

export interface Serializable {
  toJSON(): Record<string, unknown>
}

export class ResponseSerializer {
  static success<T>(data: T, message?: string): Record<string, unknown> {
    return { success: true, data, message: message ?? 'OK' }
  }

  static error(message: string, errors?: Record<string, string[]>): Record<string, unknown> {
    return { success: false, message, ...(errors ? { errors } : {}) }
  }

  static paginated<T>(data: T[], total: number, page: number, perPage: number): Record<string, unknown> {
    return {
      success: true,
      data,
      meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) },
    }
  }

  static wrap(response: SuperResponse, data: unknown, status = 200): void {
    response.status(status).json(data)
  }
}
