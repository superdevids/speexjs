import { createSign, createHash } from 'node:crypto'
import type { Queue } from '../queue/index.js'

export interface MailAttachment {
  filename: string
  content: string | Buffer
  contentType?: string
}

export interface MailMessage {
  to: string | string[]
  subject: string
  text?: string
  html?: string
  from?: string
  cc?: string | string[]
  bcc?: string | string[]
  replyTo?: string
  attachments?: MailAttachment[]
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>
}

export interface MailerOptions {
  dkim?: {
    domain: string
    selector: string
    privateKey: string
  }
}

export class Mailer {
  constructor(
    private transport: MailTransport,
    options?: MailerOptions & { queue?: Queue },
  ) {
    if (options?.queue) {
      options.queue.register('mail:send', async (payload: unknown) => {
        await this.send(payload as MailMessage)
      })
    }
  }

  async send(message: MailMessage): Promise<void> {
    const errors = validateEmail(message)
    if (errors.length > 0) {
      throw new Error(`Email validation failed: ${errors.join(', ')}`)
    }
    await this.transport.send(message)
  }

  async sendLater(message: MailMessage, queue?: Queue): Promise<void> {
    const q = queue ?? (this.transport as any).__queue
    if (q) {
      q.push('mail:send', message)
    } else {
      setImmediate(() => {
        this.send(message).catch((err) => console.error('[Mail] sendLater failed:', err))
      })
    }
  }
}

export class ConsoleMailTransport implements MailTransport {
  async send(message: MailMessage): Promise<void> {
    console.log('[Mail]', JSON.stringify(message, null, 2))
  }
}

export class SmtpMailTransport implements MailTransport {
  private dkim?: { domain: string; selector: string; privateKey: string }

  constructor(
    private config: {
      host: string
      port: number
      secure?: boolean
      auth?: { user: string; pass: string }
      from?: string
      tls?: { rejectUnauthorized?: boolean }
      dkim?: { domain: string; selector: string; privateKey: string }
    },
  ) {
    this.dkim = config.dkim
  }

  async send(message: MailMessage): Promise<void> {
    const { host, port, secure, auth } = this.config
    const raw = buildRfc822Message(message, this.config.from, this.dkim)

    const { createConnection } = await import('node:net')
    const { connect } = await import('node:tls')

    return new Promise((resolve, reject) => {
      const socket = secure
        ? (connect as any)(port, host, { rejectUnauthorized: this.config.tls?.rejectUnauthorized !== false })
        : createConnection(port, host)

      let step = 0
      let buffer = ''
      const firstRecipient = Array.isArray(message.to) ? sanitizeHeader(message.to[0] ?? '') : sanitizeHeader(message.to)

      const send = (cmd: string) => {
        socket.write(cmd + '\r\n')
      }

      socket.setTimeout(10000)
      socket.on('data', (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\r\n')
        buffer = lines.pop() ?? ''
        const last = lines[lines.length - 1] ?? ''

        if (last.length >= 4 && last[3] === '-') return
        if (!last.startsWith('2') && !last.startsWith('3')) return

        step++
        if (step === 1) {
          send('EHLO speexjs')
          return
        }
        if (step === 2) {
          if (auth) {
            send('AUTH LOGIN')
            return
          }
          step = 5
          send(`MAIL FROM:<${sanitizeHeader(message.from ?? this.config.from ?? 'noreply@speexjs.dev')}>`)
          return
        }
        if (step === 3) {
          send(Buffer.from(auth!.user).toString('base64'))
          return
        }
        if (step === 4) {
          send(Buffer.from(auth!.pass).toString('base64'))
          return
        }
        if (step === 5) {
          send(`MAIL FROM:<${sanitizeHeader(message.from ?? this.config.from ?? 'noreply@speexjs.dev')}>`)
          return
        }
        if (step === 6) {
          send(`RCPT TO:<${sanitizeHeader(firstRecipient)}>`)
          return
        }
        if (step === 7) {
          send('DATA')
          return
        }
        if (step === 8) {
          send(raw + '\r\n.')
          return
        }
        if (step === 9) {
          send('QUIT')
          socket.end()
          resolve()
          return
        }
      })
      socket.on('error', reject)
      socket.on('timeout', () => {
        socket.destroy()
        reject(new Error('SMTP timeout'))
      })
    })
  }
}

export class NodemailerTransport implements MailTransport {
  private transporter: any = null
  private initPromise: Promise<void>

  constructor(config: {
    host: string
    port: number
    secure?: boolean
    auth?: { user: string; pass: string }
  }) {
    // @ts-expect-error - nodemailer is optional
    this.initPromise = import('nodemailer')
      .then((mod: any) => {
        this.transporter = mod.default.createTransport(config)
      })
      .catch(() => {
        throw new Error('nodemailer not installed. Run: npm install nodemailer')
      })
  }

  async send(message: MailMessage): Promise<void> {
    await this.initPromise
    await this.transporter.sendMail({
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      attachments: message.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    })
  }
}

function validateEmail(message: MailMessage): string[] {
  const errors: string[] = []
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = Array.isArray(message.to) ? message.to : [message.to]
  for (const addr of recipients) {
    if (!emailRegex.test(addr)) errors.push(`Invalid recipient: ${addr}`)
  }
  if (!message.subject?.trim()) errors.push('Subject is required')
  if (!message.text && !message.html) errors.push('Body (text or html) is required')
  return errors
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '').trim()
}

function buildRfc822Message(
  message: MailMessage,
  defaultFrom?: string,
  dkim?: { domain: string; selector: string; privateKey: string },
): string {
  const sender = sanitizeHeader(defaultFrom ?? message.from ?? 'noreply@speexjs.dev')
  const to = Array.isArray(message.to) ? message.to.map(sanitizeHeader).join(', ') : sanitizeHeader(message.to)
  const cc = message.cc ? (Array.isArray(message.cc) ? message.cc.map(sanitizeHeader).join(', ') : sanitizeHeader(message.cc)) : undefined
  const bcc = message.bcc
    ? Array.isArray(message.bcc)
      ? message.bcc.map(sanitizeHeader).join(', ')
      : sanitizeHeader(message.bcc)
    : undefined
  const subject = sanitizeHeader(message.subject)
  const hasAttachments = message.attachments && message.attachments.length > 0
  const hasCcOrBcc = !!cc || !!bcc

  let header = `From: ${sender}\r\n`
  header += `To: ${to}\r\n`
  if (cc) header += `Cc: ${cc}\r\n`
  header += `Subject: ${subject}\r\n`

  if (hasAttachments) {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
    header += `MIME-Version: 1.0\r\n`
    header += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n`
    header += `\r\n--${boundary}\r\n`
    header += `Content-Type: ${message.html ? 'text/html' : 'text/plain'}; charset="utf-8"\r\n`
    header += `\r\n${message.html ?? message.text ?? ''}\r\n`

    for (const attachment of message.attachments!) {
      header += `\r\n--${boundary}\r\n`
      header += `Content-Type: ${attachment.contentType ?? 'application/octet-stream'}\r\n`
      header += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`
      header += `Content-Transfer-Encoding: base64\r\n`
      header += `\r\n`
      const content =
        typeof attachment.content === 'string' ? Buffer.from(attachment.content).toString('base64') : attachment.content.toString('base64')
      header += content.match(/.{1,76}/g)?.join('\r\n') ?? content
      header += '\r\n'
    }
    header += `\r\n--${boundary}--\r\n`

    if (dkim) {
      header = addDkimSignature(header, dkim)
    }

    return header
  }

  if (hasCcOrBcc) {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
    header += `MIME-Version: 1.0\r\n`
    header += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`
    header += `\r\n--${boundary}\r\n`
    header += `Content-Type: ${message.html ? 'text/html' : 'text/plain'}; charset="utf-8"\r\n`
    header += `\r\n${message.html ?? message.text ?? ''}\r\n`
    header += `\r\n--${boundary}--\r\n`

    if (dkim) {
      header = addDkimSignature(header, dkim)
    }

    return header
  }

  header += `MIME-Version: 1.0\r\n`
  header += `Content-Type: ${message.html ? 'text/html' : 'text/plain'}; charset="utf-8"\r\n`
  header += `\r\n${message.html ?? message.text ?? ''}`

  if (dkim) {
    header = addDkimSignature(header, dkim)
  }

  return header
}

function addDkimSignature(raw: string, dkim: { domain: string; selector: string; privateKey: string }): string {
  const { domain, selector, privateKey } = dkim
  const now = new Date()
  const timestamp = Math.floor(now.getTime() / 1000)

  const bodyHash = createHash('sha256').update(raw, 'utf-8').digest('base64')

  const dkimHeader = [
    `v=1`,
    `a=rsa-sha256`,
    `c=relaxed/relaxed`,
    `d=${domain}`,
    `s=${selector}`,
    `t=${timestamp}`,
    `bh=${bodyHash}`,
    `h=From:To:Subject`,
    `b=`,
  ].join('; ')

  const signer = createSign('rsa-sha256')
  signer.update(`DKIM-Signature: ${dkimHeader}`)
  const signature = signer.sign(privateKey, 'base64')

  const sigLines = signature.match(/.{1,76}/g)?.join('\r\n\t') ?? signature
  return `DKIM-Signature: ${dkimHeader.replace(/b=$/, `b=${sigLines}`)}\r\n${raw}`
}
