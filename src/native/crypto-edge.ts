export function webcryptoHash(data: string, algorithm: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-256'): Promise<string> {
  const encoder = new TextEncoder()
  return crypto.subtle.digest(algorithm, encoder.encode(data)).then((buf) => {
    const bytes = new Uint8Array(buf)
    let hex = ''
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i]
      if (b !== undefined) {
        hex += b.toString(16).padStart(2, '0')
      }
    }
    return hex
  })
}

export function webcryptoRandomHex(bytes: number = 32): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  let hex = ''
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i]
    if (b !== undefined) {
      hex += b.toString(16).padStart(2, '0')
    }
  }
  return hex
}

export function webcryptoRandomUUID(): string {
  return crypto.randomUUID()
}

export function webcryptoTimingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const encoder = new TextEncoder()
  const bufA = encoder.encode(a)
  const bufB = encoder.encode(b)
  let result = 0
  for (let i = 0; i < bufA.length; i++) {
    const ba = bufA[i]
    const bb = bufB[i]
    if (ba !== undefined && bb !== undefined) {
      result |= ba ^ bb
    }
  }
  return result === 0
}

export function webcryptoBase64Encode(data: string): string {
  return btoa(data)
}

export function webcryptoBase64Decode(data: string): string {
  return atob(data)
}

export function webcryptoGenerateToken(bytes: number = 48): string {
  const arr = new Uint8Array(bytes)
  crypto.getRandomValues(arr)
  let result = ''
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i]
    if (b !== undefined) {
      result += chars[b % chars.length]
    }
  }
  return result
}
