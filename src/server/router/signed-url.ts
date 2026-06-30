import { createHmac, timingSafeEqual } from 'node:crypto'

export class URLSigner {
  constructor(private secret: string) {}

  sign(url: string, expiresIn = 3600): string {
    const expires = Math.floor(Date.now() / 1000) + expiresIn
    const signature = createHmac('sha256', this.secret)
      .update(`${url}:${expires}`)
      .digest('hex')
      .slice(0, 16)
    return `${url}?expires=${expires}&signature=${signature}`
  }

  verify(signedUrl: string): { valid: boolean; url: string } {
    const parts = signedUrl.split('?')
    const base = parts[0] ?? ''
    const query = parts[1]
    if (!query || !base) return { valid: false, url: signedUrl }
    const params = new URLSearchParams(query)
    const expires = parseInt(params.get('expires') ?? '0', 10)
    const signature = params.get('signature') ?? ''
    
    if (Date.now() / 1000 > expires) return { valid: false, url: base }
    
    const expected = createHmac('sha256', this.secret)
      .update(`${base}:${expires}`)
      .digest('hex')
      .slice(0, 16)
    
    try {
      const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      return { valid, url: base }
    } catch {
      return { valid: false, url: base }
    }
  }
}
