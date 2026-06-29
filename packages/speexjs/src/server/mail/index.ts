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

export class Mailer {
  constructor(private transport: MailTransport) {}

  async send(message: MailMessage): Promise<void> {
    await this.transport.send(message)
  }

  async sendLater(message: MailMessage): Promise<void> {
    setImmediate(() => { this.send(message).catch(() => {}) })
  }
}

export class ConsoleMailTransport implements MailTransport {
  async send(message: MailMessage): Promise<void> {
    console.log('[Mail]', JSON.stringify(message, null, 2))
  }
}

function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]/g, '').trim()
}

export class SmtpMailTransport implements MailTransport {
  constructor(private config: {
    host: string
    port: number
    secure?: boolean
    auth?: { user: string; pass: string }
    from?: string
    tls?: { rejectUnauthorized?: boolean }
  }) {}

  async send(message: MailMessage): Promise<void> {
    const { host, port, secure, auth, from } = this.config
    const sender = sanitizeHeader(from ?? message.from ?? 'noreply@speexjs.dev')
    const to = Array.isArray(message.to) ? message.to.map(sanitizeHeader).join(', ') : sanitizeHeader(message.to)
    const firstRecipient = Array.isArray(message.to) ? sanitizeHeader(message.to[0] ?? '') : sanitizeHeader(message.to)
    const subject = sanitizeHeader(message.subject)
    
    let raw = `From: ${sender}\r\n`
    raw += `To: ${to}\r\n`
    raw += `Subject: ${subject}\r\n`
    raw += `MIME-Version: 1.0\r\n`
    raw += `Content-Type: text/html; charset="utf-8"\r\n`
    raw += `\r\n${message.html ?? message.text ?? ''}`
    
    const { createConnection } = await import('node:net')
    const { connect } = await import('node:tls')
    
    return new Promise((resolve, reject) => {
      const socket = secure 
        ? (connect as any)(port, host, { rejectUnauthorized: this.config.tls?.rejectUnauthorized !== false })
        : createConnection(port, host)
      
      let step = 0
      let buffer = ''
      
      const send = (cmd: string) => { socket.write(cmd + '\r\n') }
      
      socket.setTimeout(10000)
      socket.on('data', (data: Buffer) => {
        buffer += data.toString()
        const lines = buffer.split('\r\n')
        buffer = lines.pop() ?? ''
        const last = lines[lines.length - 1] ?? ''
        
        if (!last.startsWith('2') && !last.startsWith('3')) return
        
        step++
        if (step === 1) { send(`EHLO speexjs`); return }
        if (step === 2) {
          if (auth) { send(`AUTH LOGIN`); return }
          send(`MAIL FROM:<${sender}>`)
          step = 5
          return
        }
        if (step === 3) { send(Buffer.from(auth!.user).toString('base64')); return }
        if (step === 4) { send(Buffer.from(auth!.pass).toString('base64')); return }
        if (step === 5) { send(`MAIL FROM:<${sender}>`); return }
        if (step === 6) { send(`RCPT TO:<${firstRecipient}>`); return }
        if (step === 7) { send('DATA'); return }
        if (step === 8) { send(raw + '\r\n.'); return }
        if (step === 9) { send('QUIT'); socket.end(); resolve(); return }
      })
      socket.on('error', reject)
      socket.on('timeout', () => { socket.destroy(); reject(new Error('SMTP timeout')) })
    })
  }
}

export class NodemailerTransport implements MailTransport {
  private transporter: any = null
  constructor(config: { host: string; port: number; secure?: boolean; auth?: { user: string; pass: string } }) {
    // @ts-expect-error - optional dependency
    import('nodemailer').then((mod: any) => {
      this.transporter = mod.default.createTransport(config)
    }).catch(() => { throw new Error('nodemailer not installed. Run: npm install nodemailer') })
  }
  async send(message: MailMessage): Promise<void> {
    if (!this.transporter) throw new Error('Nodemailer not loaded')
    await this.transporter.sendMail({ from: message.from, to: message.to, subject: message.subject, html: message.html, text: message.text })
  }
}
