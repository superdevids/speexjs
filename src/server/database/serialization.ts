export interface SerializationConfig {
  hidden?: string[]
  appends?: Record<string, (instance: any) => any>
  casts?: Record<string, 'string' | 'number' | 'boolean' | 'date'>
}

const configs = new Map<string, SerializationConfig>()

export function defineSerialization(modelName: string, config: SerializationConfig): void {
  configs.set(modelName, config)
}

export function serialize(modelName: string, instance: any): Record<string, unknown> {
  const config = configs.get(modelName)
  if (!config) return { ...instance }

  const result: Record<string, unknown> = {}
  const hiddenSet = new Set(config.hidden ?? [])

  for (const key of Object.keys(instance)) {
    if (hiddenSet.has(key)) continue
    let value = instance[key]
    if (config.casts?.[key]) {
      switch (config.casts[key]) {
        case 'string': value = String(value); break
        case 'number': value = Number(value); break
        case 'boolean': value = Boolean(value); break
        case 'date': value = value instanceof Date ? value.toISOString() : value; break
      }
    }
    result[key] = value
  }

  if (config.appends) {
    for (const [key, fn] of Object.entries(config.appends)) {
      result[key] = fn(instance)
    }
  }

  return result
}
