import { createHmac, timingSafeEqual } from 'node:crypto'

export interface WebhookRegistration {
  id: string
  url: string
  events: string[]
  secret: string
  enabled: boolean
  createdAt: Date
}

export interface WebhookAttempt {
  webhookId: string
  event: string
  payload: unknown
  status: 'success' | 'failed'
  statusCode?: number
  error?: string
  attemptedAt: Date
}

type WebhookStore = Map<string, WebhookRegistration>

function computeSignature(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf-8').digest('hex')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const BACKOFF_DELAYS = [1000, 5000, 15000, 60000, 300000]

export class Webhook {
  private registrations: WebhookStore = new Map()
  private history: WebhookAttempt[] = []
  private maxHistory = 500

  on(url: string, events: string[], secret: string): WebhookRegistration {
    const id = crypto.randomUUID()
    const registration: WebhookRegistration = { id, url, events, secret, enabled: true, createdAt: new Date() }
    this.registrations.set(id, registration)
    return registration
  }

  off(id: string): boolean {
    return this.registrations.delete(id)
  }

  getRegistrations(): WebhookRegistration[] {
    return Array.from(this.registrations.values())
  }

  getHistory(): WebhookAttempt[] {
    return [...this.history]
  }

  async dispatch(event: string, payload: unknown): Promise<void> {
    const targets = Array.from(this.registrations.values()).filter((r) => r.enabled && r.events.includes(event))

    const results = await Promise.allSettled(targets.map((target) => this.send(target, event, payload)))

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error(`[webhook] dispatch error: ${result.reason}`)
      }
    }
  }

  private async send(registration: WebhookRegistration, event: string, payload: unknown): Promise<void> {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const signature = computeSignature(body, registration.secret)

    for (let attempt = 0; attempt < BACKOFF_DELAYS.length; attempt++) {
      try {
        const response = await fetch(registration.url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-webhook-signature': signature,
            'x-webhook-event': event,
            'x-webhook-id': registration.id,
          },
          body,
        })

        const attemptRecord: WebhookAttempt = {
          webhookId: registration.id,
          event,
          payload,
          status: response.ok ? 'success' : 'failed',
          statusCode: response.status,
          attemptedAt: new Date(),
        }

        this.history.push(attemptRecord)
        if (this.history.length > this.maxHistory) {
          this.history.splice(0, this.history.length - this.maxHistory)
        }

        if (response.ok) return

        if (attempt < BACKOFF_DELAYS.length - 1) {
          await sleep(BACKOFF_DELAYS[attempt]!)
        }
      } catch (err) {
        const attemptRecord: WebhookAttempt = {
          webhookId: registration.id,
          event,
          payload,
          status: 'failed',
          error: err instanceof Error ? err.message : String(err),
          attemptedAt: new Date(),
        }

        this.history.push(attemptRecord)
        if (this.history.length > this.maxHistory) {
          this.history.splice(0, this.history.length - this.maxHistory)
        }

        if (attempt < BACKOFF_DELAYS.length - 1) {
          await sleep(BACKOFF_DELAYS[attempt]!)
        }
      }
    }
  }

  verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = computeSignature(payload, secret)
    if (expected.length !== signature.length) return false
    return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signature, 'utf-8'))
  }
}
