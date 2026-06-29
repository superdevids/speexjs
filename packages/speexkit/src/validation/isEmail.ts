const LOCAL_SPECIAL = "!#$%&'*+/=?^_`{|}~-"

function isQuotedLocalPart(local: string): boolean {
  if (local.length < 2) return false
  let i = 1
  while (i < local.length - 1) {
    const ch = local[i]!
    if (ch === '\\') {
      i++
      if (i >= local.length - 1) return false
    } else if (ch === '"') {
      return false
    }
    i++
  }
  return true
}

function isUnquotedLocalPart(local: string): boolean {
  if (local.length === 0 || local.startsWith('.') || local.endsWith('.')) return false

  for (let i = 0; i < local.length; i++) {
    const ch = local[i]!
    if (
      (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= '0' && ch <= '9') ||
      ch === '.' ||
      LOCAL_SPECIAL.includes(ch)
    ) {
      continue
    }
    return false
  }

  for (let i = 1; i < local.length; i++) {
    if (local[i] === '.' && local[i - 1] === '.') return false
  }

  return true
}

function isValidDomain(domain: string): boolean {
  if (domain.length === 0 || domain.startsWith('.') || domain.endsWith('.')) return false

  const labels = domain.split('.')
  if (labels.length < 2) return false

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false
    if (label.startsWith('-') || label.endsWith('-')) return false

    for (let i = 0; i < label.length; i++) {
      const ch = label[i]!
      if (
        !(
          (ch >= 'a' && ch <= 'z') ||
          (ch >= 'A' && ch <= 'Z') ||
          (ch >= '0' && ch <= '9') ||
          ch === '-'
        )
      ) {
        return false
      }
    }
  }

  return true
}

/**
 * RFC‑compliant email address validation.
 *
 * Validation rules:
 * - Total length ≤ 254 characters
 * - Local part ≤ 64 characters; supports quoted strings (including escaped
 *   characters), unquoted letters / digits / `!#$%&'*+/=?^_`{|}~-`, and dots
 *   (no leading, trailing, or consecutive dots)
 * - Domain part ≤ 255 characters; valid DNS labels separated by dots, each
 *   label ≤ 63 characters, no leading/trailing hyphens, at least two labels
 *
 * @param value - The email address string
 * @returns `true` if the value is a syntactically valid email address
 *
 * @example isEmail('user@example.com')              // => true
 * @example isEmail('user.name+tag@example.co.id')   // => true
 * @example isEmail('"quoted@local"@example.com')    // => true
 * @example isEmail('not-an-email')                  // => false
 */
export function isEmail(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value.length > 254) return false

  const atIndex = value.lastIndexOf('@')
  if (atIndex < 1 || atIndex === value.length - 1) return false

  const localPart = value.slice(0, atIndex)
  const domainPart = value.slice(atIndex + 1)

  if (localPart.length > 64) return false
  if (domainPart.length > 255) return false

  if (localPart.startsWith('"') && localPart.endsWith('"')) {
    if (!isQuotedLocalPart(localPart)) return false
  } else {
    if (!isUnquotedLocalPart(localPart)) return false
  }

  return isValidDomain(domainPart)
}
