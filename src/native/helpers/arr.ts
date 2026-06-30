export class Arr {
  static first<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[0] : undefined
  }

  static last<T>(arr: T[]): T | undefined {
    return arr.length > 0 ? arr[arr.length - 1] : undefined
  }

  static pluck<T, K extends keyof T>(arr: T[], key: K): T[K][] {
    return arr.map((item) => item[key])
  }

  static groupBy<T>(
    arr: T[],
    key: keyof T | ((item: T) => string),
  ): Record<string, T[]> {
    const result: Record<string, T[]> = {}
    const getKey = typeof key === 'function' ? key : (item: T) => String(item[key])

    for (const item of arr) {
      const k = getKey(item)
      if (!result[k]) result[k] = []
      result[k].push(item)
    }

    return result
  }

  static keyBy<T>(
    arr: T[],
    key: keyof T | ((item: T) => string),
  ): Record<string, T> {
    const result: Record<string, T> = {}
    const getKey = typeof key === 'function' ? key : (item: T) => String(item[key])

    for (const item of arr) {
      result[getKey(item)] = item
    }

    return result
  }

  static sortBy<T>(
    arr: T[],
    key: keyof T | ((item: T) => unknown),
  ): T[] {
    const sorted = [...arr]
    const getKey = typeof key === 'function' ? key : (item: T) => item[key]

    sorted.sort((a, b) => {
      const ka = getKey(a) as number
      const kb = getKey(b) as number
      if (ka < kb) return -1
      if (ka > kb) return 1
      return 0
    })

    return sorted
  }

  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)]
  }

  static uniqueBy<T>(
    arr: T[],
    key: keyof T | ((item: T) => unknown),
  ): T[] {
    const seen = new Set<unknown>()
    const getKey = typeof key === 'function' ? key : (item: T) => item[key]
    return arr.filter((item) => {
      const k = getKey(item)
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  }

  static chunk<T>(arr: T[], size: number): T[][] {
    if (size < 1) return []
    const result: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size))
    }
    return result
  }

  static shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[result[i], result[j]] = [result[j]!, result[i]!]
    }
    return result
  }

  static flatten<T>(arr: unknown[]): T[] {
    const result: T[] = []
    for (const item of arr) {
      if (Array.isArray(item)) {
        result.push(...Arr.flatten<T>(item as unknown[]))
      } else {
        result.push(item as T)
      }
    }
    return result
  }

  static where<T>(arr: T[], key: keyof T, value: unknown): T[] {
    return arr.filter((item) => item[key] === value)
  }

  static whereIn<T>(arr: T[], key: keyof T, values: unknown[]): T[] {
    const set = new Set(values)
    return arr.filter((item) => set.has(item[key]))
  }

  static random<T>(arr: T[]): T | undefined {
    if (arr.length === 0) return undefined
    return arr[Math.floor(Math.random() * arr.length)]
  }
}
