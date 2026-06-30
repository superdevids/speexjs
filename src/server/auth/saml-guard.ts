import * as crypto from 'node:crypto'
import * as zlib from 'node:zlib'
import { randomHex } from '../../native/crypto.js'

export interface SamlConfig {
  entryPoint: string
  issuer: string
  cert: string
  audience?: string
  callbackUrl?: string
  nameIdFormat?: string
}

export class SamlGuard {
  private config: SamlConfig & { nameIdFormat: string }

  constructor(config: SamlConfig) {
    this.config = {
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      ...config,
    }
  }

  async getLoginRedirect(): Promise<{ url: string; relayState: string }> {
    const id = '_' + randomHex(16)
    const issueInstant = new Date().toISOString()

    const authnRequest = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"`,
      `                     xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"`,
      `                     ID="${id}"`,
      `                     Version="2.0"`,
      `                     IssueInstant="${issueInstant}"`,
      `                     ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"`,
      `                     AssertionConsumerServiceURL="${this.config.callbackUrl ?? ''}">`,
      `  <saml:Issuer>${this.xmlEscape(this.config.issuer)}</saml:Issuer>`,
      `  <samlp:NameIDPolicy Format="${this.config.nameIdFormat}" AllowCreate="true"/>`,
      '</samlp:AuthnRequest>',
    ].join('\n')

    const deflated = zlib.deflateRawSync(Buffer.from(authnRequest, 'utf8'))
    const samlRequest = deflated.toString('base64')

    const relayState = randomHex(16)

    const url = new URL(this.config.entryPoint)
    url.searchParams.set('SAMLRequest', samlRequest)
    url.searchParams.set('RelayState', relayState)

    return { url: url.toString(), relayState }
  }

  async handleCallback(
    samlResponse: string,
    relayState: string,
  ): Promise<{ user: { nameId: string; attributes: Record<string, string> }; sessionId: string }> {
    const xml = Buffer.from(samlResponse, 'base64').toString('utf8')

    const { nameId, attributes } = await this.parseSamlResponse(xml)

    const signature = this.extractSignatureValue(xml)
    const cert = this.extractCertificate(xml) ?? this.config.cert

    if (signature !== null && cert !== null) {
      const valid = this.verifySignature(xml, signature, cert)
      if (!valid) throw new Error('SAML Response signature verification failed')
    }

    const sessionId = randomHex(32)

    return { user: { nameId, attributes }, sessionId }
  }

  private async parseSamlResponse(
    xml: string,
  ): Promise<{ nameId: string; attributes: Record<string, string> }> {
    const nameId = this.extractXmlContent(xml, 'NameID') ?? this.extractXmlContent(xml, 'saml:NameID') ?? ''

    const attributes: Record<string, string> = {}
    const attrRegex = /<(?:\w+:)?Attribute\s+[^>]*Name="([^"]*)"[^>]*>([\s\S]*?)<\/(?:\w+:)?Attribute>/g
    let match: RegExpExecArray | null = attrRegex.exec(xml)
    while (match !== null) {
      const attrName = match[1]!
      const attrBody = match[2]!
      const valueMatch = attrBody.match(/<(?:\w+:)?AttributeValue[^>]*>([^<]*)<\/(?:\w+:)?AttributeValue>/)
      if (valueMatch !== null) {
        attributes[attrName] = valueMatch[1]!
      }
      match = attrRegex.exec(xml)
    }

    return { nameId, attributes }
  }

  private verifySignature(xml: string, signature: string, cert: string): boolean {
    try {
      const sigBlock =
        xml.match(/<ds:Signature[^>]*>[\s\S]*?<\/ds:Signature>/)?.[0] ??
        xml.match(/<Signature[^>]*>[\s\S]*?<\/Signature>/)?.[0] ??
        ''

      const signedInfoMatch =
        sigBlock.match(/<ds:SignedInfo>([\s\S]*?)<\/ds:SignedInfo>/) ??
        xml.match(/<SignedInfo>([\s\S]*?)<\/SignedInfo>/)

      if (!signedInfoMatch) return false

      const signedInfo = this.canonicalizeXml(
        `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">${signedInfoMatch[1]}</SignedInfo>`,
      )

      const pemCert = cert.includes('-----BEGIN')
        ? cert
        : `-----BEGIN CERTIFICATE-----\n${cert.match(/.{1,64}/g)?.join('\n')}\n-----END CERTIFICATE-----`

      const sigBuffer = Buffer.from(signature, 'base64')
      const verifier = crypto.createVerify('RSA-SHA256')
      verifier.update(signedInfo, 'utf8')
      return verifier.verify(pemCert, sigBuffer)
    } catch {
      return false
    }
  }

  private extractSignatureValue(xml: string): string | null {
    const match =
      xml.match(/<ds:SignatureValue>([^<]*)<\/ds:SignatureValue>/) ??
      xml.match(/<SignatureValue[^>]*>([^<]*)<\/SignatureValue>/)
    return match?.[1] ?? null
  }

  private extractCertificate(xml: string): string | null {
    const match =
      xml.match(/<ds:X509Certificate>([^<]*)<\/ds:X509Certificate>/) ??
      xml.match(/<X509Certificate[^>]*>([^<]*)<\/X509Certificate>/)
    return match?.[1] ?? null
  }

  private extractXmlContent(xml: string, tag: string): string | null {
    const prefixed = new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`)
    const namespaced = new RegExp(`<\\w+:${tag}[^>]*>([^<]*)<\\/\\w+:${tag}>`)
    return xml.match(prefixed)?.[1] ?? xml.match(namespaced)?.[1] ?? null
  }

  private canonicalizeXml(xml: string): string {
    return xml
      .replace(/\r\n?/g, '\n')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  private xmlEscape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
}
