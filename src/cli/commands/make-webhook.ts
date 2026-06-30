import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { colors } from '../../native/colors.js'

export async function makeWebhook(name: string): Promise<void> {
  const dir = join(process.cwd(), 'src', 'webhooks')
  const filePath = join(dir, `${name}.ts`)

  if (existsSync(filePath)) {
    console.error(colors.red(`Webhook '${name}' already exists at ${filePath}`))
    process.exit(1)
  }

  mkdirSync(dir, { recursive: true })

  const content = `import { Webhook } from 'speexjs'

export function register${name.charAt(0).toUpperCase() + name.slice(1)}Webhook(webhook: Webhook) {
  webhook.on(
    '${process.env.WEBHOOK_URL ?? 'https://example.com/webhook'}',
    ['event.created', 'event.updated'],
    process.env.WEBHOOK_SECRET ?? 'change-me',
  )
}
`

  writeFileSync(filePath, content, 'utf-8')
  console.log(colors.green(`✓ Webhook '${name}' created at ${filePath}`))
}
