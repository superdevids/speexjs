export class HeadersMap {
  private data: Map<string, string[]>

  constructor(initial?: Record<string, string | string[]>) {
    this.data = new Map()
    if (initial) {
      for (const key of Object.keys(initial)) {
        const value = initial[key]
        if (value !== undefined) {
          this.set(key, Array.isArray(value) ? value.join(', ') : value)
        }
      }
    }
  }

  get(name: string): string | undefined {
    const values = this.data.get(name.toLowerCase())
    if (values !== undefined && values.length > 0) {
      return values[0]
    }
    return undefined
  }

  getAll(name: string): string[] {
    const values = this.data.get(name.toLowerCase())
    return values ?? []
  }

  set(name: string, value: string): void {
    this.data.set(name.toLowerCase(), [value])
  }

  append(name: string, value: string): void {
    const key = name.toLowerCase()
    const existing = this.data.get(key)
    if (existing !== undefined) {
      existing.push(value)
    } else {
      this.data.set(key, [value])
    }
  }

  has(name: string): boolean {
    return this.data.has(name.toLowerCase())
  }

  delete(name: string): void {
    this.data.delete(name.toLowerCase())
  }

  *entries(): IterableIterator<[string, string]> {
    for (const [key, values] of this.data) {
      for (const value of values) {
        yield [key, value]
      }
    }
  }

  *keys(): IterableIterator<string> {
    for (const key of this.data.keys()) {
      yield key
    }
  }

  *values(): IterableIterator<string> {
    for (const [, values] of this.data) {
      for (const value of values) {
        yield value
      }
    }
  }

  toJSON(): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {}
    for (const [key, values] of this.data) {
      result[key] = values.length === 1 ? (values[0] as string) : values
    }
    return result
  }

  toNodeHeaders(): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {}
    for (const [key, values] of this.data) {
      if (key === 'set-cookie') {
        result[key] = values
      } else {
        result[key] = values.join(', ')
      }
    }
    return result
  }

  get size(): number {
    return this.data.size
  }

  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries()
  }
}
