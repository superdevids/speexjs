export interface IsStrongPasswordOptions {
  minLength?: number
  minLowercase?: number
  minUppercase?: number
  minNumbers?: number
  minSymbols?: number
}

/**
 * Checks if a password meets strength requirements.
 *
 * Default requirements: min 8 chars, at least 1 lowercase, 1 uppercase,
 * 1 number, and 1 symbol.
 *
 * @param value - The password string.
 * @param options - Optional custom requirements.
 * @returns Whether the password meets all requirements.
 *
 * @example
 * isStrongPassword('P@ssw0rd') // true
 * isStrongPassword('weak') // false
 */
export function isStrongPassword(value: string, options?: IsStrongPasswordOptions): boolean {
  if (typeof value !== 'string') return false

  const {
    minLength = 8,
    minLowercase = 1,
    minUppercase = 1,
    minNumbers = 1,
    minSymbols = 1,
  } = options ?? {}

  if (value.length < minLength) return false

  let lc = 0, uc = 0, num = 0, sym = 0
  for (let i = 0; i < value.length; i++) {
    const c = value[i]!
    if (c >= 'a' && c <= 'z') lc++
    else if (c >= 'A' && c <= 'Z') uc++
    else if (c >= '0' && c <= '9') num++
    else sym++
  }

  return lc >= minLowercase && uc >= minUppercase && num >= minNumbers && sym >= minSymbols
}
