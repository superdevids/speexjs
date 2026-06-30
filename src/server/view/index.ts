import { resolve } from 'node:path'
import { resolveAndRender } from './layout-engine.js'

export interface ViewEngine {
  render(page: string, props?: Record<string, unknown>): Promise<string>
  renderWithMeta(page: string, ctx?: any): Promise<{ html: string; metadata: Record<string, string> }>
}

export class PageView implements ViewEngine {
  private pagesDir: string

  constructor(pagesDir?: string) {
    this.pagesDir = pagesDir ?? resolve(process.cwd(), 'src/pages')
  }

  async render(page: string, props?: Record<string, unknown>): Promise<string> {
    const { html } = await resolveAndRender(this.pagesDir, page, props ?? {})
    return html
  }

  async renderWithMeta(page: string, ctx?: any): Promise<{ html: string; metadata: Record<string, string> }> {
    return resolveAndRender(this.pagesDir, page, ctx)
  }
}
