export interface CookieOptions {
  maxAge?: number
  expires?: Date
  path?: string
  domain?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  signed?: boolean
}

export function parseCookies(header: string): Record<string, string> {
  const result: Record<string, string> = {}

  if (!header) return result

  const pairs = header.split(';')

  for (const pair of pairs) {
    const trimmed = pair.trim()
    if (!trimmed) continue

    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) {
      result[trimmed] = ''
      continue
    }

    const name = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    if (name) {
      result[decodeURIComponent(name)] = decodeURIComponent(value)
    }
  }

  return result
}

function serializeCookieValue(name: string, value: string): string {
  return `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
}

export function serializeCookie(
  name: string,
  value: string,
  options?: CookieOptions,
): string {
  const parts: string[] = [serializeCookieValue(name, value)]

  if (options) {
    if (options.maxAge !== undefined) {
      parts.push(`Max-Age=${Math.floor(options.maxAge)}`)
    }

    if (options.expires !== undefined) {
      parts.push(`Expires=${options.expires.toUTCString()}`)
    }

    if (options.path !== undefined) {
      parts.push(`Path=${options.path}`)
    } else {
      parts.push('Path=/')
    }

    if (options.domain !== undefined) {
      parts.push(`Domain=${options.domain}`)
    }

    if (options.secure) {
      parts.push('Secure')
    }

    if (options.httpOnly) {
      parts.push('HttpOnly')
    }

    if (options.sameSite !== undefined) {
      parts.push(`SameSite=${options.sameSite}`)
    }
  }

  return parts.join('; ')
}

export function clearCookie(name: string, options?: CookieOptions): string {
  return serializeCookie(name, '', {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  })
}
