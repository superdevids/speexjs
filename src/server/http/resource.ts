export class ApiResource {
  static collection(data: any[], transformer?: (item: any) => Record<string, unknown>) {
    return { data: transformer ? data.map(transformer) : data }
  }

  static item(data: any, transformer?: (item: any) => Record<string, unknown>) {
    return { data: transformer ? transformer(data) : data }
  }

  static paginated(data: any[], total: number, page: number, perPage: number) {
    return { data, meta: { total, page, perPage, lastPage: Math.ceil(total / perPage) } }
  }

  static error(message: string, _status = 400, errors?: Record<string, string[]>) {
    const result: any = { message }
    if (errors) result.errors = errors
    return result
  }
}
