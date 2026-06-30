import { createHash, createHmac } from 'node:crypto'

export interface Broadcaster {
  broadcast(channel: string, event: string, data: unknown): Promise<void>
}

export class PusherBroadcaster implements Broadcaster {
  constructor(private config: { appId: string; key: string; secret: string; cluster?: string }) {}
  async broadcast(channel: string, event: string, data: unknown): Promise<void> {
    const { appId, key, secret, cluster } = this.config
    const body = JSON.stringify({ name: event, channels: [channel], data: JSON.stringify(data) })
    const timestamp = Date.now().toString()
    const bodyMd5 = createHash('md5').update(body).digest('hex')
    const signStr = `POST\n/apps/${appId}/events\nauth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}`
    const signature = createHmac('sha256', secret).update(signStr).digest('hex')
    await fetch(`https://api-${cluster ?? 'us2'}.pusher.com/apps/${appId}/events?auth_key=${key}&auth_timestamp=${timestamp}&auth_version=1.0&body_md5=${bodyMd5}&auth_signature=${signature}`, { method: 'POST', body, headers: { 'content-type': 'application/json' } })
  }
}

export class AblyBroadcaster implements Broadcaster {
  constructor(private apiKey: string) {}
  async broadcast(channel: string, event: string, data: unknown): Promise<void> {
    await fetch(`https://rest.ably.io/channels/${encodeURIComponent(channel)}/messages`, {
      method: 'POST', body: JSON.stringify({ name: event, data }), headers: { 'authorization': `Basic ${Buffer.from(`${this.apiKey}:`).toString('base64')}`, 'content-type': 'application/json' },
    })
  }
}
