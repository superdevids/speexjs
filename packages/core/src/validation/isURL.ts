const IPV4_OCTET = /^(?:[0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/

function isValidIPv4(hostname: string): boolean {
  const octets = hostname.split('.')
  if (octets.length !== 4) return false
  return octets.every(octet => IPV4_OCTET.test(octet))
}

function isValidDNSHostname(hostname: string): boolean {
  if (hostname.startsWith('.') || hostname.endsWith('.')) return false

  const labels = hostname.split('.')
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

function isValidHostname(hostname: string): boolean {
  if (hostname.length === 0) return false

  // IPv6 literal
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return hostname.length > 2
  }

  // IPv4
  if (/^\d/.test(hostname) || /\d$/.test(hostname)) {
    if (isValidIPv4(hostname)) return true
  }

  // localhost
  if (hostname === 'localhost') return true

  // DNS hostname
  return isValidDNSHostname(hostname)
}

/**
 * Validates a URL.
 *
 * A valid URL:
 * - Must use the `http` or `https` protocol
 * - Must have a valid hostname (DNS name, IPv4, IPv6 literal, or `localhost`)
 * - May include an optional port, path, query string, and fragment
 *
 * @param value - The URL string
 * @returns `true` if the value is a valid http/https URL
 *
 * @example isURL('https://example.com')                 // => true
 * @example isURL('http://example.com:8080/path?q=1#f')  // => true
 * @example isURL('ftp://example.com')                   // => false
 * @example isURL('not-a-url')                           // => false
 */
export function isURL(value: string): boolean {
  try {
    const url = new URL(value)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false
    }

    return isValidHostname(url.hostname)
  } catch {
    return false
  }
}
