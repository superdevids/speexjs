import * as crypto from 'node:crypto'
import { randomHex } from '../../native/crypto.js'

export interface PasskeyCredential {
  id: string
  publicKey: string
  algorithm: number
  transports?: string[]
}

interface AuthenticatorData {
  rpIdHash: Buffer
  flags: number
  signCount: number
  attestedCredentialData?: Buffer
  extensions?: Buffer
}

export class WebAuthn {
  private rpName: string
  private rpId: string
  private origin: string

  constructor(options?: { rpName?: string; rpId?: string; origin?: string }) {
    this.rpName = options?.rpName ?? 'SpeexJS App'
    this.rpId = options?.rpId ?? 'localhost'
    this.origin = options?.origin ?? 'http://localhost:3000'
  }

  async generateRegistrationOptions(user: {
    id: string
    name: string
    displayName: string
  }): Promise<RegistrationOptions> {
    const challenge = randomHex(32)

    return {
      challenge: this.base64UrlEncode(Buffer.from(challenge, 'hex')),
      rp: {
        name: this.rpName,
        id: this.rpId,
      },
      user: {
        id: this.base64UrlEncode(Buffer.from(user.id, 'utf8')),
        name: user.name,
        displayName: user.displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
        { type: 'public-key', alg: -35 },
        { type: 'public-key', alg: -36 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    }
  }

  async verifyRegistration(
    response: {
      id: string
      rawId: string
      response: {
        clientDataJSON: string
        attestationObject: string
      }
    },
    expectedChallenge: string,
  ): Promise<PasskeyCredential> {
    const clientDataJson = this.base64UrlDecode(response.response.clientDataJSON)
    const clientData = JSON.parse(clientDataJson.toString('utf8'))

    if (clientData.type !== 'webauthn.create') {
      throw new Error('Invalid clientData type')
    }

    const challenge = this.base64UrlDecode(clientData.challenge).toString('hex')
    if (challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch')
    }

    if (clientData.origin !== this.origin) {
      throw new Error('Origin mismatch')
    }

    const attestationObject = this.base64UrlDecode(response.response.attestationObject)
    const authData = this.parseAuthData(attestationObject)

    this.verifyRpId(authData.rpIdHash)

    if (!(authData.flags & 0x40)) {
      throw new Error('User not present')
    }

    if (!authData.attestedCredentialData) {
      throw new Error('No attested credential data')
    }

    const credential = this.parseAttestedCredentialData(authData.attestedCredentialData)

    return {
      id: response.id,
      publicKey: credential.publicKeyPem,
      algorithm: credential.algorithm,
      transports: ['internal'],
    }
  }

  async generateAuthenticationOptions(
    credentials: PasskeyCredential[],
  ): Promise<AuthenticationOptions> {
    const challenge = randomHex(32)

    return {
      challenge: this.base64UrlEncode(Buffer.from(challenge, 'hex')),
      allowCredentials: credentials.map((cred) => ({
        id: cred.id,
        type: 'public-key' as const,
        transports: cred.transports,
      })),
      userVerification: 'preferred',
      timeout: 60000,
      rpId: this.rpId,
    }
  }

  async verifyAuthentication(
    response: {
      id: string
      rawId: string
      response: {
        clientDataJSON: string
        authenticatorData: string
        signature: string
        userHandle?: string
      }
    },
    credential: PasskeyCredential,
    expectedChallenge: string,
  ): Promise<boolean> {
    const clientDataJson = this.base64UrlDecode(response.response.clientDataJSON)
    const clientData = JSON.parse(clientDataJson.toString('utf8'))

    if (clientData.type !== 'webauthn.get') {
      throw new Error('Invalid clientData type')
    }

    const challenge = this.base64UrlDecode(clientData.challenge).toString('hex')
    if (challenge !== expectedChallenge) {
      throw new Error('Challenge mismatch')
    }

    if (clientData.origin !== this.origin) {
      throw new Error('Origin mismatch')
    }

    const authenticatorData = this.base64UrlDecode(response.response.authenticatorData)
    const authData = this.parseAuthData(authenticatorData)

    this.verifyRpId(authData.rpIdHash)

    if (!(authData.flags & 0x01)) {
      throw new Error('User not present')
    }

    const clientDataHash = crypto.createHash('sha256').update(clientDataJson).digest()
    const signatureBase = Buffer.concat([authenticatorData, clientDataHash])

    const sigBuffer = this.base64UrlDecode(response.response.signature)

    return this.verifySignature(signatureBase, sigBuffer, credential)
  }

  private verifySignature(
    data: Buffer,
    signature: Buffer,
    credential: PasskeyCredential,
  ): boolean {
    try {
      if (credential.algorithm === -7 || credential.algorithm === -35 || credential.algorithm === -36) {
        const coordLen = credential.algorithm === -7 ? 32 : credential.algorithm === -35 ? 48 : 66
        const r = signature.subarray(0, coordLen)
        const s = signature.subarray(coordLen, coordLen * 2)
        const rSig = this.ensureLength(r, coordLen)
        const sSig = this.ensureLength(s, coordLen)
        const derSig = this.toDerSignature(rSig, sSig)

        const key = crypto.createPublicKey(credential.publicKey)
        const verifier = crypto.createVerify(`SHA${coordLen * 16}`)
        verifier.update(data)
        return verifier.verify(key, derSig)
      }

      if (credential.algorithm === -257 || credential.algorithm === -258 || credential.algorithm === -259) {
        const hashName = credential.algorithm === -257 ? 'RSA-SHA256' : credential.algorithm === -258 ? 'RSA-SHA384' : 'RSA-SHA512'
        const key = crypto.createPublicKey(credential.publicKey)
        const verifier = crypto.createVerify(hashName)
        verifier.update(data)
        return verifier.verify(key, signature)
      }

      throw new Error(`Unsupported algorithm: ${credential.algorithm}`)
    } catch {
      return false
    }
  }

  private parseAuthData(buffer: Buffer): AuthenticatorData {
    const rpIdHash = buffer.subarray(0, 32)
    const flags = buffer[32]!
    const signCount = buffer.readUInt32BE(33)

    let offset = 37
    let attestedCredentialData: Buffer | undefined
    let extensions: Buffer | undefined

    if (flags & 0x40) {
      offset += 16
      const credIdLen = buffer.readUInt16BE(offset)
      offset += 2
      offset += credIdLen

      const coseKeyStart = offset
      const coseKeyEnd = this.findCoseKeyEnd(buffer, offset)
      offset = coseKeyEnd

      attestedCredentialData = buffer.subarray(37, offset)
    }

    if (flags & 0x80 && offset < buffer.length) {
      extensions = buffer.subarray(offset)
    }

    return { rpIdHash, flags, signCount, attestedCredentialData, extensions }
  }

  private findCoseKeyEnd(buffer: Buffer, offset: number): number {
    const pairs = buffer[offset]! & 0x07
    let current = offset + 1

    for (let i = 0; i < pairs && current < buffer.length; i++) {
      const labelResult = this.decodeCborItem(buffer, current)
      current = labelResult.offset
      const valueResult = this.decodeCborItem(buffer, current)
      current = valueResult.offset
    }

    return current
  }

  private parseAttestedCredentialData(
    buffer: Buffer,
  ): { publicKeyPem: string; algorithm: number } {
    const coseKey = this.parseCoseKey(buffer.subarray(16))
    const publicKeyPem = this.coseKeyToPem(coseKey)
    return { publicKeyPem, algorithm: coseKey.get(3) as number }
  }

  private parseCoseKey(buffer: Buffer): Map<number, unknown> {
    const map = new Map<number, unknown>()
    let offset = 0

    const firstByte = buffer[offset]!
    offset++

    const numPairs = firstByte & 0x0f
    for (let i = 0; i < numPairs && offset < buffer.length; i++) {
      const label = this.decodeCborInt(buffer, offset)
      offset = label.offset
      const value = this.decodeCborValue(buffer, offset)
      offset = value.offset
      map.set(label.value, value.value)
    }

    return map
  }

  private decodeCborItem(buffer: Buffer, offset: number): { value: number; offset: number } {
    return this.decodeCborInt(buffer, offset)
  }

  private decodeCborInt(
    buffer: Buffer,
    offset: number,
  ): { value: number; offset: number } {
    const byte = buffer[offset]!
    const mt = byte >> 5
    const ni = byte & 0x1f
    let val: number
    let off = offset + 1

    if (ni < 24) {
      val = ni
    } else if (ni === 24) {
      val = buffer[off]!
      off++
    } else if (ni === 25) {
      val = buffer.readUInt16BE(off)
      off += 2
    } else {
      val = buffer.readUInt32BE(off)
      off += 4
    }

    if (mt === 1) val = -1 - val

    return { value: val, offset: off }
  }

  private decodeCborValue(
    buffer: Buffer,
    offset: number,
  ): { value: unknown; offset: number } {
    const byte = buffer[offset]!
    const mt = byte >> 5

    if (mt === 0 || mt === 1) {
      return this.decodeCborInt(buffer, offset)
    }

    if (mt === 2 || mt === 3) {
      const len = byte & 0x1f
      let strLen: number
      let off = offset + 1

      if (len < 24) strLen = len
      else if (len === 24) {
        strLen = buffer[off]!
        off++
      } else if (len === 25) {
        strLen = buffer.readUInt16BE(off)
        off += 2
      } else {
        strLen = buffer.readUInt32BE(off)
        off += 4
      }

      const data = buffer.subarray(off, off + strLen)
      return { value: data, offset: off + strLen }
    }

    return { value: null, offset: offset + 1 }
  }

  private coseKeyToPem(coseKey: Map<number, unknown>): string {
    const kty = coseKey.get(1) as number
    const alg = coseKey.get(3) as number

    if (kty === 2) {
      const crv = coseKey.get(-1) as number
      const x = coseKey.get(-2) as Buffer
      const y = coseKey.get(-3) as Buffer

      let crvName: string
      if (crv === 1) crvName = 'P-256'
      else if (crv === 2) crvName = 'P-384'
      else if (crv === 3) crvName = 'P-521'
      else throw new Error(`Unsupported EC curve: ${crv}`)

      const key = crypto.createPublicKey({
        key: {
          kty: 'EC',
          crv: crvName,
          x: x.toString('base64url'),
          y: y.toString('base64url'),
        },
        format: 'jwk',
      })

      return key.export({ type: 'spki', format: 'pem' }).toString()
    }

    if (kty === 3) {
      const n = coseKey.get(-1) as Buffer
      const e = coseKey.get(-2) as Buffer

      const key = crypto.createPublicKey({
        key: {
          kty: 'RSA',
          n: n.toString('base64url'),
          e: e.toString('base64url'),
        },
        format: 'jwk',
      })

      return key.export({ type: 'spki', format: 'pem' }).toString()
    }

    throw new Error(`Unsupported COSE key type: ${kty}`)
  }

  private verifyRpId(rpIdHash: Buffer): void {
    const expectedHash = crypto.createHash('sha256').update(this.rpId).digest()
    if (!crypto.timingSafeEqual(rpIdHash, expectedHash)) {
      throw new Error('RP ID hash mismatch')
    }
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

  private base64UrlEncode(buffer: Buffer): string {
    return buffer.toString('base64url')
  }

  private base64UrlDecode(input: string): Buffer {
    return Buffer.from(input, 'base64url')
  }
}

export interface RegistrationOptions {
  challenge: string
  rp: { name: string; id: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: { type: string; alg: number }[]
  authenticatorSelection: {
    authenticatorAttachment: string
    residentKey: string
    userVerification: string
  }
  timeout: number
  attestation: string
}

export interface AuthenticationOptions {
  challenge: string
  allowCredentials: {
    id: string
    type: string
    transports?: string[]
  }[]
  userVerification: string
  timeout: number
  rpId: string
}
