/**
 * Checks if a string is a valid IPv4 address.
 */
export function isIPv4(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  const parts = value.split('.')
  if (parts.length !== 4) return false
  return parts.every(part => {
    if (part.length === 0 || part.length > 3) return false
    if (part !== '0' && part.startsWith('0')) return false
    const num = Number(part)
    return Number.isInteger(num) && num >= 0 && num <= 255
  })
}
export function isIPv6(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false
  const ipv4MappedMatch = value.match(/^([0-9a-fA-F:.]+):(\d+\.\d+\.\d+\.\d+)$/)
  if (ipv4MappedMatch) {
    const [, ipv6Part, ipv4Part] = ipv4MappedMatch
    if (!isIPv4(ipv4Part!)) return false
    value = ipv6Part!
  }
  const hasDoubleColon = value.includes('::')
  if (!hasDoubleColon) {
    const groups = value.split(':')
    if (groups.length !== 8) return false
    return groups.every(g => /^[0-9a-fA-F]{1,4}$/.test(g))
  }
  const parts = value.split('::')
  if (parts.length > 2) return false
  const left = parts[0] ? parts[0].split(':') : []
  const right = parts[1] ? parts[1].split(':') : []
  if (left.length + right.length > 7) return false
  const middle = 8 - left.length - right.length
  const all = [...left, ...Array(middle).fill('0'), ...right]
  return all.every(g => /^[0-9a-fA-F]{1,4}$/.test(g))
}
export function isIP(value: string, version?: 4 | 6): boolean {
  if (version === 4) return isIPv4(value)
  if (version === 6) return isIPv6(value)
  return isIPv4(value) || isIPv6(value)
}