import type { QueryRunner } from '../database/types.js'

export interface Notification {
  id?: string
  type: string
  notifiableId: string | number
  data: Record<string, unknown>
  readAt?: Date | null
  createdAt?: Date
}

export class NotificationSender {
  constructor(private db?: QueryRunner) {}

  async send(notification: Notification): Promise<void> {
    if (!this.db) return
    const dialect = this.db.getDialect()
    await this.db.raw(
      `INSERT INTO ${dialect.wrapIdentifier('notifications')} 
       (\`type\`, \`notifiable_id\`, \`data\`, \`created_at\`) VALUES (?, ?, ?, ?)`,
      [notification.type, notification.notifiableId, JSON.stringify(notification.data), new Date().toISOString()]
    )
  }

  async markAsRead(id: string): Promise<void> {
    if (!this.db) return
    await this.db.raw('UPDATE notifications SET read_at = ? WHERE id = ?', [new Date().toISOString(), id])
  }

  async getUnread(notifiableId: string | number): Promise<Notification[]> {
    if (!this.db) return []
    const dialect = this.db.getDialect()
    const result = await this.db.raw(
      `SELECT * FROM ${dialect.wrapIdentifier('notifications')} 
       WHERE notifiable_id = ? AND read_at IS NULL ORDER BY created_at DESC`,
      [notifiableId]
    )
    return result.rows.map((r: any) => ({
      ...r, data: typeof r.data === 'string' ? JSON.parse(r.data) : r.data,
    }))
  }
}
