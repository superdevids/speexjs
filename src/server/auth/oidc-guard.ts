import * as crypto from 'node:crypto'
import { randomHex } from '../../native/crypto.js'

interface OidcDiscovery {
  authorization_endpoint: string
  token_endpoint: string
  jwks_uri: string
  issuer: string
}

interface Jwk {
  kty: string
  kid?: string
  use?: string
  alg?: string
  n?: string
  e?: string
  crv?: string
  x?: string
  y?: string
}

interface JwksResponse {
  keys: Jwk[]
}

interface JwtHeader {
  alg: string
  kid?: string
  typ?: string
}

export interface JwtPayload {
  iss?: string
  sub?: string
  aud?: string | string[]
  exp?: number
  iat?: number
  nonce?: string
  [key: string]: unknown
}

export interface OidcConfig {
  issuer: string
  clientId: string
  clientSecret: string
  redirectUri: string
  scopes?: string[]
}

export class OidcGuard {
  private config: OidcConfig & { scopes: string[] }
  private cachedDiscovery: OidcDiscovery | null = null

  constructor(config: OidcConfig) {
    this.config = {
      scopes: ['openid', 'profile', 'email'],
      ...config,
    }
  }

  async getAuthorizationUrl(): Promise<{ url: string; state: string; nonce: string }> {
    const discovery = await this.discoverConfiguration()
    const state = randomHex(16)
    const nonce = randomHex(16)

    const authUrl = new URL(discovery.authorization_endpoint)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', this.config.clientId)
    authUrl.searchParams.set('redirect_uri', this.config.redirectUri)
    authUrl.searchParams.set('scope', this.config.scopes.join(' '))
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('nonce', nonce)

    return { url: authUrl.toString(), state, nonce }
  }

  async handleCallback(
    code: string,
    _state: string,
    nonce: string,
  ): Promise<{ user: JwtPayload; sessionId: string; idToken: string }> {
    const discovery = await this.discoverConfiguration()

    const tokenResponse = await this.exchangeCode(discovery.token_endpoint, code)

    const idToken = tokenResponse.id_token
    if (!idToken) throw new Error('No id_token in token response')

    const user = await this.validateIdToken(idToken, nonce)

    const sessionId = randomHex(32)

    return { user, sessionId, idToken }
  }

  private async exchangeCode(
    tokenEndpoint: string,
    code: string,
  ): Promise<{ access_token?: string; id_token?: string; refresh_token?: string; expires_in?: number }> {
    const params = new URLSearchParams()
    params.set('grant_type', 'authorization_code')
    params.set('code', code)
    params.set('redirect_uri', this.config.redirectUri)
    params.set('client_id', this.config.clientId)
    params.set('client_secret', this.config.clientSecret)

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: params.toString(),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Token exchange failed (${response.status}): ${body}`)
    }

    return response.json() as Promise<{ access_token?: string; id_token?: string; refresh_token?: string; expires_in?: number }>
  }

  async validateIdToken(idToken: string, nonce: string): Promise<JwtPayload> {
    const parts = idToken.split('.')
    if (parts.length !== 3) throw new Error('Invalid JWT format')

    const header = this.base64UrlDecodeToJson<JwtHeader>(parts[0]!)
    const payload = this.base64UrlDecodeToJson<JwtPayload>(parts[1]!)
    const signature = parts[2]!

    if (!header.alg || header.alg === 'none') {
      throw new Error('JWT algorithm not supported')
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      throw new Error('ID token expired')
    }

    if (payload.nonce && payload.nonce !== nonce) {
      throw new Error('ID token nonce mismatch')
    }

    if (payload.iss && payload.iss !== this.config.issuer) {
      throw new Error('ID token issuer mismatch')
    }

    if (payload.aud) {
      const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
      if (!audiences.includes(this.config.clientId)) {
        throw new Error('ID token audience mismatch')
      }
    }

    const discovery = await this.discoverConfiguration()
    const jwksResponse = await this.fetchJwks(discovery.jwks_uri)
    const jwk = this.findJwk(jwksResponse.keys, header.kid)

    if (!jwk) {
      throw new Error('No matching JWK found')
    }

    const valid = await this.verifyJwtSignature(header.alg, `${parts[0]!}.${parts[1]!}`, signature, jwk)
    if (!valid) throw new Error('JWT signature verification failed')

    return payload
  }

  private async verifyJwtSignature(
    alg: string,
    signingInput: string,
    signature: string,
    jwk: Jwk,
  ): Promise<boolean> {
    const sigBuffer = this.base64UrlDecode(signature)

    try {
      if (alg.startsWith('RS')) {
        const key = await this.jwkToPublicKey(jwk)
        const verifier = crypto.createVerify(alg.toLowerCase())
        verifier.update(signingInput, 'utf8')
        return verifier.verify(key, sigBuffer)
      }

      if (alg.startsWith('ES')) {
        const ecSig = this.convertEcdsaSignature(sigBuffer, alg)
        const key = await this.jwkToPublicKey(jwk)
        const verifier = crypto.createVerify(alg.toLowerCase())
        verifier.update(signingInput, 'utf8')
        return verifier.verify(key, ecSig)
      }

      throw new Error(`Unsupported JWT algorithm: ${alg}`)
    } catch (err) {
      if (err instanceof Error && err.message.includes('Unsupported')) throw err
      return false
    }
  }

  private async jwkToPublicKey(jwk: Jwk): Promise<crypto.KeyObject> {
    if (jwk.kty === 'RSA') {
      return crypto.createPublicKey({
        key: {
          kty: 'RSA',
          n: jwk.n,
          e: jwk.e,
        },
        format: 'jwk',
      })
    }

    if (jwk.kty === 'EC') {
      return crypto.createPublicKey({
        key: {
          kty: 'EC',
          crv: jwk.crv,
          x: jwk.x,
          y: jwk.y,
        },
        format: 'jwk',
      })
    }

    throw new Error(`Unsupported JWK key type: ${jwk.kty}`)
  }

  private convertEcdsaSignature(sigBuffer: Buffer, alg: string): Buffer {
    const coordLen = alg === 'ES256' ? 32 : alg === 'ES384' ? 48 : 66
    const r = sigBuffer.subarray(0, coordLen)
    const s = sigBuffer.subarray(coordLen, coordLen * 2)
    return this.toDerSignature(this.ensureLength(r, coordLen), this.ensureLength(s, coordLen))
  }

  private toDerSignature(r: Buffer, s: Buffer): Buffer {
    const rDer = this.encodeDerInteger(r)
    const sDer = this.encodeDerInteger(s)
    const seq = Buffer.concat([rDer, sDer])
    const header = Buffer.alloc(2)
    header[0] = 0x30
    header[1] = seq.length
    return Buffer.concat([header, seq])
  }

  private encodeDerInteger(buffer: Buffer): Buffer {
    const needsZeroPrefix = buffer[0]! & 0x80
    const data = needsZeroPrefix ? Buffer.concat([Buffer.from([0]), buffer]) : buffer
    const header = Buffer.alloc(2)
    header[0] = 0x02
    header[1] = data.length
    return Buffer.concat([header, data])
  }

  private ensureLength(buffer: Buffer, length: number): Buffer {
    if (buffer.length === length) return buffer
    if (buffer.length < length) {
      const padded = Buffer.alloc(length, 0)
      buffer.copy(padded, length - buffer.length)
      return padded
    }
    return buffer.subarray(buffer.length - length)
  }

  private findJwk(keys: Jwk[], kid?: string): Jwk | undefined {
    if (kid) return keys.find((k) => k.kid === kid)
    return keys[0]
  }

  private async discoverConfiguration(): Promise<OidcDiscovery> {
    if (this.cachedDiscovery) return this.cachedDiscovery

    const wellKnownUrl = `${this.config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`
    const response = await fetch(wellKnownUrl)
    if (!response.ok) throw new Error(`OIDC discovery failed: ${response.status}`)

    const data = (await response.json()) as OidcDiscovery
    this.cachedDiscovery = data
    return data
  }

  private async fetchJwks(jwksUri: string): Promise<JwksResponse> {
    const response = await fetch(jwksUri)
    if (!response.ok) throw new Error(`JWKS fetch failed: ${response.status}`)
    return response.json() as Promise<JwksResponse>
  }

  private base64UrlDecode(input: string): Buffer {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4))
    return Buffer.from(base64 + padding, 'base64')
  }

  private base64UrlDecodeToJson<T>(input: string): T {
    const json = this.base64UrlDecode(input).toString('utf8')
    return JSON.parse(json) as T
  }
}
