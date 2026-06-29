export function requireEnv(...keys: string[]): void {
  const missing = keys.filter(k => !process.env[k])
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`)
    process.exit(1)
  }
}

export function validateEnv(rules: Record<string, { required?: boolean; pattern?: RegExp; message?: string }>): void {
  for (const [key, rule] of Object.entries(rules)) {
    const value = process.env[key]
    if (rule.required && !value) {
      console.error(`❌ ${rule.message ?? `Missing required env: ${key}`}`)
      process.exit(1)
    }
    if (value && rule.pattern && !rule.pattern.test(value)) {
      console.error(`❌ ${rule.message ?? `Invalid env: ${key}`}`)
      process.exit(1)
    }
  }
}
