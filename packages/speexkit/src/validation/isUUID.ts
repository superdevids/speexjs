const UUIDS_RE: Record<number, RegExp> = {
  1: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-1[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
  2: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-2[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
  3: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-3[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
  4: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
  5: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-5[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/,
}

const UUID_NIL = '00000000-0000-0000-0000-000000000000'

/**
 * Checks if a string is a valid UUID (v1–v5).
 *
 * @param value - The string to validate.
 * @param version - Optional UUID version to restrict to (1–5).
 * @returns Whether the value is a valid UUID.
 *
 * @example
 * isUUID('550e8400-e29b-41d4-a716-446655440000') // true (v4)
 * isUUID('550e8400-e29b-41d4-a716-446655440000', 4) // true
 * isUUID('not-a-uuid') // false
 */
export function isUUID(value: string, version?: 1 | 2 | 3 | 4 | 5): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  if (value === UUID_NIL) return true
  if (version !== undefined) return UUIDS_RE[version]?.test(value) ?? false
  return Object.values(UUIDS_RE).some(r => r.test(value))
}
