export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

export class TemplateEngine {
  private templates = new Map<string, (data: Record<string, unknown>) => EmailTemplate>()

  register(name: string, render: (data: Record<string, unknown>) => EmailTemplate): void {
    this.templates.set(name, render)
  }

  render(name: string, data: Record<string, unknown>): EmailTemplate {
    const template = this.templates.get(name)
    if (!template) throw new Error(`Template "${name}" not found`)
    return template(data)
  }
}

export const defaultTemplates = new TemplateEngine()

defaultTemplates.register('welcome', (data) => ({
  subject: `Welcome, ${data.name ?? 'User'}!`,
  html: `<h1>Welcome!</h1><p>Hi ${data.name ?? 'there'}, thanks for joining!</p>`,
  text: `Welcome!\nHi ${data.name ?? 'there'}, thanks for joining!`,
}))

defaultTemplates.register('reset-password', (data) => ({
  subject: 'Password Reset Request',
  html: `<h1>Reset Your Password</h1><p>Click <a href="${data.url ?? '#'}">here</a> to reset your password.</p>`,
  text: `Reset Your Password\nVisit: ${data.url ?? '#'}`,
}))
