import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SuperApp } from '../index.js'

export interface PageComponent {
  type: 'text' | 'image' | 'button' | 'card' | 'table' | 'form' | 'navbar' | 'hero'
  props: Record<string, any>
  children?: PageComponent[]
}

interface PageData {
  title: string
  components: PageComponent[]
  createdAt: string
  updatedAt: string
}

export class PageBuilder {
  private storeDir: string
  private pages = new Map<string, PageData>()
  private loaded = false

  constructor(storeDir?: string) {
    this.storeDir = storeDir ?? resolve(process.cwd(), 'storage/pages')
  }

  private ensureLoaded(): void {
    if (this.loaded) return
    this.loaded = true
    if (!existsSync(this.storeDir)) {
      mkdirSync(this.storeDir, { recursive: true })
      return
    }
    const { readdirSync } = require('node:fs')
    try {
      const files = readdirSync(this.storeDir).filter((f: string) => f.endsWith('.json'))
      for (const file of files) {
        const slug = file.replace(/\.json$/, '')
        const content = readFileSync(resolve(this.storeDir, file), 'utf-8')
        try {
          this.pages.set(slug, JSON.parse(content) as PageData)
        } catch {
          /* skip corrupt files */
        }
      }
    } catch {
      /* ignore */
    }
  }

  private persist(slug: string): void {
    const data = this.pages.get(slug)
    if (!data) return
    mkdirSync(this.storeDir, { recursive: true })
    writeFileSync(resolve(this.storeDir, `${slug}.json`), JSON.stringify(data, null, 2), 'utf-8')
  }

  async createPage(slug: string, title: string, components: PageComponent[]): Promise<void> {
    this.ensureLoaded()
    const now = new Date().toISOString()
    this.pages.set(slug, { title, components, createdAt: now, updatedAt: now })
    this.persist(slug)
  }

  async getPage(slug: string): Promise<{ title: string; components: PageComponent[] } | null> {
    this.ensureLoaded()
    const page = this.pages.get(slug)
    if (!page) return null
    return { title: page.title, components: page.components }
  }

  async renderPage(slug: string): Promise<string> {
    const page = await this.getPage(slug)
    if (!page) throw new Error(`Page "${slug}" not found`)
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${escapeHtml(page.title)}</title><script src="https://cdn.tailwindcss.com"></script></head><body>${renderComponents(page.components)}</body></html>`
  }

  async listPages(): Promise<Array<{ slug: string; title: string }>> {
    this.ensureLoaded()
    return Array.from(this.pages.entries()).map(([slug, data]) => ({ slug, title: data.title }))
  }

  async deletePage(slug: string): Promise<void> {
    this.ensureLoaded()
    this.pages.delete(slug)
    const filePath = resolve(this.storeDir, `${slug}.json`)
    try {
      const { unlinkSync } = require('node:fs')
      unlinkSync(filePath)
    } catch {
      /* ignore */
    }
  }

  async exportToTsx(slug: string): Promise<string> {
    const page = await this.getPage(slug)
    if (!page) throw new Error(`Page "${slug}" not found`)
    const lines: string[] = [
      `import type { VNode } from 'speexjs/client/vdom'`,
      ``,
      `interface ${pascalCase(slug)}PageProps {`,
      `  data?: Record<string, unknown>`,
      `}`,
      ``,
      `export default function ${pascalCase(slug)}Page(props: ${pascalCase(slug)}PageProps): VNode {`,
      `  return (`,
    ]
    const tsx = renderComponentsToTsx(page.components, 2)
    lines.push(tsx)
    lines.push(`  )`)
    lines.push(`}`)
    lines.push(``)
    return lines.join('\n')
  }

  registerRoutes(app: SuperApp): void {
    this.ensureLoaded()

    app.get('/_speexjs/admin/builder', async (ctx) => {
      const html = generateBuilderHtml(this)
      ctx.response.type('text/html; charset=utf-8').send(html)
    })

    app.post('/_speexjs/admin/builder/api/pages', async (ctx) => {
      const request = ctx.request as any
      const body = await request.body()
      await this.createPage(body.slug, body.title, body.components)
      ctx.response.json({ ok: true })
    })

    app.get('/_speexjs/admin/builder/api/pages', async (ctx) => {
      const pages = await this.listPages()
      ctx.response.json({ data: pages })
    })

    app.get('/_speexjs/admin/builder/api/pages/:slug', async (ctx) => {
      const page = await this.getPage(ctx.params.slug!)
      if (!page) {
        ctx.response.status(404).json({ error: 'Page not found' })
        return
      }
      ctx.response.json({ data: page })
    })

    app.put('/_speexjs/admin/builder/api/pages/:slug', async (ctx) => {
      const request = ctx.request as any
      const body = await request.body()
      await this.createPage(ctx.params.slug!, body.title, body.components)
      ctx.response.json({ ok: true })
    })

    app.delete('/_speexjs/admin/builder/api/pages/:slug', async (ctx) => {
      await this.deletePage(ctx.params.slug!)
      ctx.response.json({ ok: true })
    })

    app.get('/_speexjs/admin/builder/api/export/:slug', async (ctx) => {
      try {
        const tsx = await this.exportToTsx(ctx.params.slug!)
        ctx.response.type('text/typescript; charset=utf-8').send(tsx)
      } catch {
        ctx.response.status(404).json({ error: 'Page not found' })
      }
    })

    app.get('/pages/:slug', async (ctx) => {
      try {
        const html = await this.renderPage(ctx.params.slug!)
        ctx.response.type('text/html; charset=utf-8').send(html)
      } catch {
        ctx.response.status(404).html('<h1>Page not found</h1>')
      }
    })
  }
}

function renderComponents(components: PageComponent[]): string {
  return components.map(renderComponent).join('\n')
}

function renderComponent(c: PageComponent): string {
  const children = c.children ? renderComponents(c.children) : ''

  switch (c.type) {
    case 'text':
      return `<div class="prose max-w-none">${escapeHtml(c.props.content || '')}</div>`

    case 'image':
      return `<img src="${escapeHtml(c.props.src || '')}" alt="${escapeHtml(c.props.alt || '')}" class="max-w-full h-auto ${c.props.className || ''}" />`

    case 'button':
      return `<a href="${escapeHtml(c.props.href || '#')}" class="inline-block px-6 py-3 rounded-lg font-semibold text-center transition-colors ${c.props.variant === 'outline' ? 'border-2 border-current text-gray-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'} ${c.props.className || ''}">${escapeHtml(c.props.text || 'Button')}</a>`

    case 'card':
      return `<div class="rounded-xl border bg-white shadow-sm overflow-hidden ${c.props.className || ''}"><div class="p-6">${c.props.image ? `<img src="${escapeHtml(c.props.image)}" alt="" class="w-full h-48 object-cover -mt-6 -mx-6 mb-4" />` : ''}${c.props.title ? `<h3 class="text-lg font-semibold mb-2">${escapeHtml(c.props.title)}</h3>` : ''}${c.props.content ? `<p class="text-gray-600">${escapeHtml(c.props.content)}</p>` : ''}${children}</div></div>`

    case 'table':
      return renderTableComponent(c)

    case 'form':
      return renderFormComponent(c)

    case 'navbar':
      return renderNavbarComponent(c)

    case 'hero':
      return `<section class="py-20 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100 ${c.props.className || ''}"><div class="max-w-4xl mx-auto">${c.props.title ? `<h1 class="text-4xl md:text-5xl font-bold mb-4">${escapeHtml(c.props.title)}</h1>` : ''}${c.props.subtitle ? `<p class="text-xl text-gray-600 mb-8">${escapeHtml(c.props.subtitle)}</p>` : ''}${c.props.image ? `<img src="${escapeHtml(c.props.image)}" alt="" class="mx-auto rounded-lg shadow-lg max-w-full" />` : ''}${c.props.ctaText ? `<a href="${escapeHtml(c.props.ctaHref || '#')}" class="inline-block mt-6 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">${escapeHtml(c.props.ctaText)}</a>` : ''}${children}</div></section>`

    default:
      return `<div>Unknown component: ${c.type}</div>`
  }
}

function renderTableComponent(c: PageComponent): string {
  const headers = Array.isArray(c.props.headers) ? c.props.headers : []
  const rows = Array.isArray(c.props.rows) ? c.props.rows : []
  return `<div class="overflow-x-auto rounded-lg border ${c.props.className || ''}"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr>${headers.map((h: string) => `<th class="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody class="divide-y divide-gray-200 bg-white">${rows.map((row: string[]) => `<tr class="hover:bg-gray-50">${row.map((cell: string) => `<td class="px-4 py-3 text-sm text-gray-700">${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
}

function renderFormComponent(c: PageComponent): string {
  const fields = Array.isArray(c.props.fields) ? c.props.fields : []
  return `<form class="space-y-4 ${c.props.className || ''}" ${c.props.submitUrl ? `action="${escapeHtml(c.props.submitUrl)}" method="POST"` : ''}>${fields.map((f: any) => `<div><label class="block text-sm font-medium text-gray-700 mb-1">${escapeHtml(f.label || f.name)}</label>${f.type === 'textarea' ? `<textarea name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''}></textarea>` : f.type === 'select' ? `<select name="${escapeHtml(f.name)}" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''}>${Array.isArray(f.options) ? f.options.map((o: string) => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('') : ''}</select>` : `<input type="${f.type || 'text'}" name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" class="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''} />`}</div>`).join('')}${c.props.submitText ? `<button type="submit" class="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">${escapeHtml(c.props.submitText)}</button>` : ''}</form>`
}

function renderNavbarComponent(c: PageComponent): string {
  const links = Array.isArray(c.props.links) ? c.props.links : []
  const brand = c.props.brand || 'Site'
  return `<nav class="bg-white border-b shadow-sm ${c.props.className || ''}"><div class="max-w-7xl mx-auto px-4 flex items-center justify-between h-16"><a href="${escapeHtml(c.props.homeUrl || '/')}" class="text-xl font-bold text-gray-900">${escapeHtml(brand)}</a><div class="flex items-center gap-6">${links.map((l: any) => `<a href="${escapeHtml(l.href || '#')}" class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">${escapeHtml(l.label || l.text || 'Link')}</a>`).join('')}</div></div></nav>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function renderComponentsToTsx(components: PageComponent[], indent: number): string {
  const pad = '  '.repeat(indent)
  return components.map((c) => renderComponentToTsx(c, indent + 1)).join(`\n${pad}\n`)
}

function renderComponentToTsx(c: PageComponent, indent: number): string {
  const pad = '  '.repeat(indent)
  const padInner = '  '.repeat(indent + 1)

  switch (c.type) {
    case 'text':
      return `${pad}<div className="prose max-w-none">${escapeJsx(c.props.content || '')}</div>`

    case 'image':
      return `${pad}<img src="${escapeJsx(c.props.src || '')}" alt="${escapeJsx(c.props.alt || '')}" className="max-w-full h-auto ${c.props.className || ''}" />`

    case 'button':
      return `${pad}<a href="${escapeJsx(c.props.href || '#')}" className="inline-block px-6 py-3 rounded-lg font-semibold text-center transition-colors ${c.props.variant === 'outline' ? 'border-2 border-current text-gray-700 hover:bg-gray-100' : 'bg-blue-600 text-white hover:bg-blue-700'} ${c.props.className || ''}">${escapeJsx(c.props.text || 'Button')}</a>`

    case 'card':
      return `${pad}<div className="rounded-xl border bg-white shadow-sm overflow-hidden ${c.props.className || ''}">\n${padInner}<div className="p-6">\n${c.props.image ? `${padInner}<img src="${escapeJsx(c.props.image)}" alt="" className="w-full h-48 object-cover -mt-6 -mx-6 mb-4" />\n` : ''}${c.props.title ? `${padInner}<h3 className="text-lg font-semibold mb-2">${escapeJsx(c.props.title)}</h3>\n` : ''}${c.props.content ? `${padInner}<p className="text-gray-600">${escapeJsx(c.props.content)}</p>\n` : ''}${c.children ? renderComponentsToTsx(c.children, indent + 2) : ''}\n${padInner}</div>\n${pad}</div>`

    case 'table':
      return renderTableToTsx(c, pad, padInner)

    case 'form':
      return renderFormToTsx(c, pad, padInner)

    case 'navbar':
      return renderNavbarToTsx(c, pad, padInner)

    case 'hero':
      return `${pad}<section className="py-20 px-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100 ${c.props.className || ''}">\n${padInner}<div className="max-w-4xl mx-auto">\n${c.props.title ? `${padInner}<h1 className="text-4xl md:text-5xl font-bold mb-4">{${JSON.stringify(c.props.title)}}</h1>\n` : ''}${c.props.subtitle ? `${padInner}<p className="text-xl text-gray-600 mb-8">{${JSON.stringify(c.props.subtitle)}}</p>\n` : ''}${c.props.image ? `${padInner}<img src={${JSON.stringify(c.props.image)}} alt="" className="mx-auto rounded-lg shadow-lg max-w-full" />\n` : ''}${c.props.ctaText ? `${padInner}<a href={${JSON.stringify(c.props.ctaHref || '#')}} className="inline-block mt-6 px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">{${JSON.stringify(c.props.ctaText)}}</a>\n` : ''}${c.children ? renderComponentsToTsx(c.children, indent + 2) : ''}\n${padInner}</div>\n${pad}</section>`

    default:
      return `${pad}<div>Unknown component: ${c.type}</div>`
  }
}

function renderTableToTsx(c: PageComponent, pad: string, padInner: string): string {
  const headers = Array.isArray(c.props.headers) ? c.props.headers : []
  const rows = Array.isArray(c.props.rows) ? c.props.rows : []
  const lines = [`${pad}<div className="overflow-x-auto rounded-lg border ${c.props.className || ''}">`]
  lines.push(`${padInner}<table className="min-w-full divide-y divide-gray-200">`)
  lines.push(`${padInner}<thead className="bg-gray-50">`)
  lines.push(`${padInner}<tr>`)
  for (const h of headers) {
    lines.push(`${padInner}  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">${escapeJsx(h)}</th>`)
  }
  lines.push(`${padInner}</tr>`)
  lines.push(`${padInner}</thead>`)
  lines.push(`${padInner}<tbody className="divide-y divide-gray-200 bg-white">`)
  for (const row of rows) {
    lines.push(`${padInner}<tr className="hover:bg-gray-50">`)
    for (const cell of row) {
      lines.push(`${padInner}  <td className="px-4 py-3 text-sm text-gray-700">${escapeJsx(cell)}</td>`)
    }
    lines.push(`${padInner}</tr>`)
  }
  lines.push(`${padInner}</tbody>`)
  lines.push(`${padInner}</table>`)
  lines.push(`${pad}</div>`)
  return lines.join('\n')
}

function renderFormToTsx(c: PageComponent, pad: string, padInner: string): string {
  const fields = Array.isArray(c.props.fields) ? c.props.fields : []
  const lines = [
    `${pad}<form className="space-y-4 ${c.props.className || ''}"${c.props.submitUrl ? ` action={${JSON.stringify(c.props.submitUrl)}} method="POST"` : ''}>`,
  ]
  for (const f of fields) {
    lines.push(`${padInner}<div>`)
    lines.push(`${padInner}  <label className="block text-sm font-medium text-gray-700 mb-1">${escapeJsx(f.label || f.name)}</label>`)
    if (f.type === 'textarea') {
      lines.push(
        `${padInner}  <textarea name="${escapeJsx(f.name)}" placeholder="${escapeJsx(f.placeholder || '')}" className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''}></textarea>`,
      )
    } else if (f.type === 'select') {
      lines.push(
        `${padInner}  <select name="${escapeJsx(f.name)}" className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''}>`,
      )
      for (const o of f.options || []) {
        lines.push(`${padInner}    <option value="${escapeJsx(o)}">${escapeJsx(o)}</option>`)
      }
      lines.push(`${padInner}  </select>`)
    } else {
      lines.push(
        `${padInner}  <input type="${f.type || 'text'}" name="${escapeJsx(f.name)}" placeholder="${escapeJsx(f.placeholder || '')}" className="w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" ${f.required ? 'required' : ''} />`,
      )
    }
    lines.push(`${padInner}</div>`)
  }
  if (c.props.submitText) {
    lines.push(
      `${padInner}<button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">${escapeJsx(c.props.submitText)}</button>`,
    )
  }
  lines.push(`${pad}</form>`)
  return lines.join('\n')
}

function renderNavbarToTsx(c: PageComponent, pad: string, padInner: string): string {
  const links = Array.isArray(c.props.links) ? c.props.links : []
  const brand = c.props.brand || 'Site'
  const lines = [`${pad}<nav className="bg-white border-b shadow-sm ${c.props.className || ''}">`]
  lines.push(`${padInner}<div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">`)
  lines.push(
    `${padInner}  <a href={${JSON.stringify(c.props.homeUrl || '/')}} className="text-xl font-bold text-gray-900">${escapeJsx(brand)}</a>`,
  )
  lines.push(`${padInner}  <div className="flex items-center gap-6">`)
  for (const l of links) {
    lines.push(
      `${padInner}    <a href={${JSON.stringify(l.href || '#')}} className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">${escapeJsx(l.label || l.text || 'Link')}</a>`,
    )
  }
  lines.push(`${padInner}  </div>`)
  lines.push(`${padInner}</div>`)
  lines.push(`${pad}</nav>`)
  return lines.join('\n')
}

function escapeJsx(s: string): string {
  if (s.includes('{') || s.includes('}')) {
    return `{${JSON.stringify(s)}}`
  }
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function pascalCase(s: string): string {
  return s.replace(/[-_\s]+(.)?/g, (_, c) => (c ?? '').toUpperCase()).replace(/^(.)/, (c) => c.toUpperCase())
}

function generateBuilderHtml(_builder: PageBuilder): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Visual Page Builder - SpeexJS</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; }
  .builder-layout { display: flex; height: 100vh; }
  .sidebar { width: 320px; background: #fff; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; flex-shrink: 0; }
  .sidebar-header { padding: 16px; border-bottom: 1px solid #e2e8f0; }
  .sidebar-header h1 { font-size: 18px; font-weight: 700; }
  .sidebar-header p { font-size: 12px; color: #64748b; margin-top: 2px; }
  .component-list { padding: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; overflow-y: auto; flex: 1; }
  .component-btn { padding: 12px 8px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: pointer; text-align: center; font-size: 13px; font-weight: 500; transition: all 0.15s; }
  .component-btn:hover { border-color: #3b82f6; background: #eff6ff; color: #2563eb; }
  .canvas { flex: 1; display: flex; flex-direction: column; }
  .canvas-toolbar { padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .canvas-toolbar input { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; width: 200px; }
  .canvas-toolbar button { padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid #e2e8f0; background: #fff; transition: all 0.15s; }
  .canvas-toolbar button:hover { background: #f1f5f9; }
  .canvas-toolbar .btn-primary { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .canvas-toolbar .btn-primary:hover { background: #2563eb; }
  .canvas-toolbar .btn-danger { color: #ef4444; border-color: #ef4444; }
  .canvas-toolbar .btn-danger:hover { background: #fef2f2; }
  .canvas-area { flex: 1; overflow-y: auto; padding: 24px; background: #f1f5f9; }
  .canvas-dropzone { min-height: 400px; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; background: #fff; transition: all 0.2s; }
  .canvas-dropzone.drag-over { border-color: #3b82f6; background: #eff6ff; }
  .canvas-item { position: relative; margin-bottom: 12px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; cursor: move; transition: all 0.15s; }
  .canvas-item:hover { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
  .canvas-item.selected { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.3); }
  .canvas-item .item-actions { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; }
  .canvas-item:hover .item-actions { display: flex; }
  .canvas-item .item-actions button { padding: 2px 8px; font-size: 11px; border-radius: 4px; border: 1px solid #e2e8f0; background: #fff; cursor: pointer; }
  .canvas-item .item-actions button:hover { background: #f1f5f9; }
  .canvas-item .item-actions .del-btn:hover { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
  .props-panel { width: 340px; background: #fff; border-left: 1px solid #e2e8f0; padding: 16px; overflow-y: auto; flex-shrink: 0; }
  .props-panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
  .props-panel .field { margin-bottom: 12px; }
  .props-panel label { display: block; font-size: 12px; font-weight: 500; color: #64748b; margin-bottom: 4px; }
  .props-panel input, .props-panel textarea, .props-panel select { width: 100%; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; }
  .props-panel textarea { min-height: 60px; resize: vertical; }
  .props-panel input:focus, .props-panel textarea:focus { outline: none; border-color: #3b82f6; ring: 2px solid rgba(59,130,246,0.2); }
  .empty-state { text-align: center; padding: 60px 20px; color: #94a3b8; }
  .empty-state p { font-size: 14px; margin-top: 8px; }
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 50; }
  .modal { background: #fff; border-radius: 12px; padding: 24px; width: 90%; max-width: 500px; max-height: 80vh; overflow-y: auto; }
  .modal h2 { font-size: 18px; font-weight: 700; margin-bottom: 16px; }
  .modal .field { margin-bottom: 12px; }
  .modal label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 4px; }
  .modal input, .modal textarea, .modal select { width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 14px; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 500; background: #e2e8f0; color: #475569; }
  .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; color: #fff; font-size: 14px; font-weight: 500; z-index: 100; animation: slideIn 0.3s ease; }
  .toast.success { background: #22c55e; }
  .toast.error { background: #ef4444; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .tabs { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px; }
  .tab { padding: 8px 16px; font-size: 13px; font-weight: 500; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s; }
  .tab.active { border-bottom-color: #3b82f6; color: #3b82f6; }
</style>
</head>
<body>
<div class="builder-layout">
  <div class="sidebar">
    <div class="sidebar-header">
      <h1>Page Builder</h1>
      <p>Drag components to build your page</p>
    </div>
    <div class="tabs">
      <div class="tab active" onclick="showTab('components')">Components</div>
      <div class="tab" onclick="showTab('pages')">Pages</div>
    </div>
    <div id="tab-components" class="component-list">
      <div class="component-btn" onclick="addComponent('text')">📝 Text</div>
      <div class="component-btn" onclick="addComponent('image')">🖼️ Image</div>
      <div class="component-btn" onclick="addComponent('button')">🔘 Button</div>
      <div class="component-btn" onclick="addComponent('card')">🃏 Card</div>
      <div class="component-btn" onclick="addComponent('table')">📊 Table</div>
      <div class="component-btn" onclick="addComponent('form')">📋 Form</div>
      <div class="component-btn" onclick="addComponent('navbar')">🧭 Navbar</div>
      <div class="component-btn" onclick="addComponent('hero')">🎯 Hero</div>
    </div>
    <div id="tab-pages" class="component-list" style="display:none; grid-template-columns:1fr;">
      <div id="page-list"></div>
    </div>
  </div>

  <div class="canvas">
    <div class="canvas-toolbar">
      <div style="display:flex;align-items:center;gap:8px;">
        <input id="page-title" type="text" placeholder="Page title..." value="My Page" />
        <input id="page-slug" type="text" placeholder="page-slug" value="my-page" />
        <button onclick="savePage()" class="btn-primary">💾 Save</button>
      </div>
      <div style="display:flex;gap:6px;align-items:center;">
        <span id="component-count" class="badge">0 components</span>
        <button onclick="clearCanvas()" class="btn-danger">🗑️ Clear</button>
        <button onclick="exportPage()">📦 Export TSX</button>
        <button onclick="loadPage()">📂 Open</button>
        <button onclick="previewPage()">👁️ Preview</button>
      </div>
    </div>
    <div class="canvas-area" id="canvas-area">
      <div class="canvas-dropzone" id="dropzone">
        <div class="empty-state" id="empty-state">
          <div style="font-size:48px;margin-bottom:12px;">🧩</div>
          <p>Click a component from the sidebar to add it</p>
          <p style="font-size:12px;margin-top:4px;">Or drag and rearrange items below</p>
        </div>
        <div id="canvas-items"></div>
      </div>
    </div>
  </div>

  <div class="props-panel" id="props-panel">
    <h3>Properties</h3>
    <p style="font-size:13px;color:#94a3b8;">Select a component to edit its properties</p>
    <div id="props-form"></div>
  </div>
</div>

<div id="modal-container"></div>
<div id="toast-container"></div>

<script>
const COMPONENT_TYPES = ['text', 'image', 'button', 'card', 'table', 'form', 'navbar', 'hero'];

const defaultProps = {
  text: { content: 'This is a text block. Edit me!' },
  image: { src: 'https://placehold.co/800x400/EEE/999?text=Image', alt: 'Image' },
  button: { text: 'Click Me', href: '#', variant: 'solid' },
  card: { title: 'Card Title', content: 'Card content goes here.' },
  table: { headers: ['Name', 'Email', 'Role'], rows: [['John Doe', 'john@example.com', 'Admin'], ['Jane Smith', 'jane@example.com', 'User']] },
  form: { fields: [{ name: 'name', label: 'Name', type: 'text', required: true }, { name: 'email', label: 'Email', type: 'email' }], submitText: 'Submit' },
  navbar: { brand: 'My Site', homeUrl: '/', links: [{ label: 'Home', href: '/' }, { label: 'About', href: '/about' }, { label: 'Contact', href: '/contact' }] },
  hero: { title: 'Welcome to My Site', subtitle: 'Build something amazing today.', ctaText: 'Get Started', ctaHref: '#' }
};

const typeIcons = { text: '📝', image: '🖼️', button: '🔘', card: '🃏', table: '📊', form: '📋', navbar: '🧭', hero: '🎯' };

let components = [];
let selectedIndex = -1;
let nextId = 1;

function showTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-components').style.display = name === 'components' ? 'grid' : 'none';
  document.getElementById('tab-pages').style.display = name === 'pages' ? 'grid' : 'none';
  if (name === 'pages') refreshPageList();
}

function addComponent(type) {
  const icon = typeIcons[type] || '🧩';
  components.push({ id: nextId++, type, props: JSON.parse(JSON.stringify(defaultProps[type] || {})), children: [] });
  renderCanvas();
  selectComponent(components.length - 1);
  showToast(\`Added \${icon} \${type} component\`, 'success');
}

function renderCanvas() {
  const container = document.getElementById('canvas-items');
  const empty = document.getElementById('empty-state');
  const count = document.getElementById('component-count');

  if (components.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    count.textContent = '0 components';
    return;
  }

  empty.style.display = 'none';
  count.textContent = components.length + ' component' + (components.length > 1 ? 's' : '');

  container.innerHTML = components.map((c, i) => {
    const icon = typeIcons[c.type] || '🧩';
    const label = c.type.charAt(0).toUpperCase() + c.type.slice(1);
    const preview = getPreview(c);
    return \`<div class="canvas-item \${i === selectedIndex ? 'selected' : ''}" draggable="true" onclick="selectComponent(\${i})" data-index="\${i}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span style="font-size:16px;">\${icon}</span>
        <span style="font-weight:600;font-size:14px;">\${label}</span>
        <span style="font-size:11px;color:#94a3b8;">#\${c.id}</span>
      </div>
      <div style="font-size:13px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\${preview}</div>
      <div class="item-actions">
        <button onclick="event.stopPropagation();duplicateComponent(\${i})">📋</button>
        <button onclick="event.stopPropagation();moveComponent(\${i}, -1)">↑</button>
        <button onclick="event.stopPropagation();moveComponent(\${i}, 1)">↓</button>
        <button class="del-btn" onclick="event.stopPropagation();deleteComponent(\${i})">✕</button>
      </div>
    </div>\`;
  }).join('');

  attachDragEvents();
  if (selectedIndex >= 0 && selectedIndex < components.length) {
    showProps(selectedIndex);
  } else {
    document.getElementById('props-form').innerHTML = '';
  }
}

function getPreview(c) {
  switch (c.type) {
    case 'text': return c.props.content || '(empty)';
    case 'image': return c.props.src || '(no src)';
    case 'button': return c.props.text || '(no text)';
    case 'card': return c.props.title || '(no title)';
    case 'table': return \`\${(c.props.headers||[]).length} cols, \${(c.props.rows||[]).length} rows\`;
    case 'form': return \`\${(c.props.fields||[]).length} fields\`;
    case 'navbar': return c.props.brand || 'Site';
    case 'hero': return c.props.title || '(no title)';
    default: return '';
  }
}

function selectComponent(index) {
  selectedIndex = index;
  renderCanvas();
  if (index >= 0 && index < components.length) {
    showProps(index);
  }
}

function showProps(index) {
  const c = components[index];
  if (!c) return;
  const panel = document.getElementById('props-form');
  let html = '<div style="margin-bottom:12px;font-size:12px;color:#64748b;">Type: <strong>' + c.type + '</strong> | ID: ' + c.id + '</div>';

  for (const [key, val] of Object.entries(c.props)) {
    if (Array.isArray(val)) {
      html += '<div class="field"><label>' + key + '</label>';
      if (key === 'headers' || key === 'rows' || key === 'fields' || key === 'links' || key === 'options') {
        html += '<textarea onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)" rows="4">' + JSON.stringify(val) + '</textarea>';
        html += '<div style="font-size:11px;color:#94a3b8;margin-top:2px;">JSON array</div>';
      } else {
        html += '<input value="' + escapeHtml(JSON.stringify(val)) + '" onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)" />';
      }
      html += '</div>';
    } else if (typeof val === 'object' && val !== null) {
      html += '<div class="field"><label>' + key + '</label>';
      html += '<textarea onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)" rows="3">' + JSON.stringify(val) + '</textarea>';
      html += '</div>';
    } else {
      html += '<div class="field"><label>' + key + '</label>';
      if (key === 'variant') {
        html += '<select onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)">';
        html += '<option value="solid" ' + (val === 'solid' ? 'selected' : '') + '>Solid</option>';
        html += '<option value="outline" ' + (val === 'outline' ? 'selected' : '') + '>Outline</option>';
        html += '</select>';
      } else if (key === 'src' || key === 'href' || key === 'ctaHref' || key === 'homeUrl') {
        html += '<input value="' + escapeHtml(String(val)) + '" onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)" />';
      } else if (typeof val === 'boolean') {
        html += '<select onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)">';
        html += '<option value="true" ' + (val === true ? 'selected' : '') + '>Yes</option>';
        html += '<option value="false" ' + (val === false ? 'selected' : '') + '>No</option>';
        html += '</select>';
      } else {
        html += '<input value="' + escapeHtml(String(val)) + '" onchange="updateProp(' + index + ',\\\'' + key + '\\\',this.value)" />';
      }
      html += '</div>';
    }
  }

  if (c.type === 'table' && c.props.headers && c.props.rows) {
    html += '<div style="margin-top:16px;"><button onclick="addTableRow(' + index + ')" style="width:100%;padding:6px;border:1px dashed #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;">+ Add Row</button></div>';
  }
  if (c.type === 'form' && c.props.fields) {
    html += '<div style="margin-top:16px;"><button onclick="addFormField(' + index + ')" style="width:100%;padding:6px;border:1px dashed #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;">+ Add Field</button></div>';
  }
  if (c.type === 'navbar' && c.props.links) {
    html += '<div style="margin-top:16px;"><button onclick="addNavLink(' + index + ')" style="width:100%;padding:6px;border:1px dashed #e2e8f0;border-radius:6px;background:#f8fafc;cursor:pointer;font-size:13px;">+ Add Link</button></div>';
  }

  panel.innerHTML = html;
}

function updateProp(index, key, value) {
  const c = components[index];
  if (!c) return;

  if (key === 'headers' || key === 'rows' || key === 'fields' || key === 'links' || key === 'options') {
    try { c.props[key] = JSON.parse(value); } catch { c.props[key] = []; }
  } else if (typeof c.props[key] === 'boolean') {
    c.props[key] = value === 'true';
  } else {
    c.props[key] = value;
  }
  renderCanvas();
}

function deleteComponent(index) {
  components.splice(index, 1);
  if (selectedIndex >= components.length) selectedIndex = components.length - 1;
  if (components.length === 0) selectedIndex = -1;
  renderCanvas();
}

function duplicateComponent(index) {
  const c = components[index];
  if (!c) return;
  const clone = JSON.parse(JSON.stringify(c));
  clone.id = nextId++;
  components.splice(index + 1, 0, clone);
  renderCanvas();
}

function moveComponent(index, dir) {
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= components.length) return;
  [components[index], components[newIndex]] = [components[newIndex], components[index]];
  selectedIndex = newIndex;
  renderCanvas();
}

function clearCanvas() {
  if (components.length === 0) return;
  if (!confirm('Clear all components?')) return;
  components = [];
  selectedIndex = -1;
  renderCanvas();
}

function attachDragEvents() {
  const items = document.querySelectorAll('.canvas-item');
  let dragIndex = -1;
  items.forEach(item => {
    item.addEventListener('dragstart', () => {
      dragIndex = parseInt(item.dataset.index);
      item.style.opacity = '0.4';
    });
    item.addEventListener('dragend', () => { item.style.opacity = '1'; });
    item.addEventListener('dragover', e => { e.preventDefault(); });
    item.addEventListener('drop', e => {
      e.preventDefault();
      const targetIndex = parseInt(item.dataset.index);
      if (dragIndex >= 0 && targetIndex >= 0 && dragIndex !== targetIndex) {
        const [moved] = components.splice(dragIndex, 1);
        components.splice(targetIndex, 0, moved);
        selectedIndex = targetIndex;
        renderCanvas();
      }
    });
  });
}

function savePage() {
  const title = document.getElementById('page-title').value || 'Untitled';
  let slug = document.getElementById('page-slug').value || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!slug) slug = 'page-' + Date.now();

  fetch('/_speexjs/admin/builder/api/pages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, title, components })
  }).then(r => r.json()).then(() => {
    showToast('✅ Page "' + title + '" saved!', 'success');
    refreshPageList();
  }).catch(e => showToast('❌ Error: ' + e.message, 'error'));
}

function loadPage() {
  const slug = prompt('Enter page slug to load:');
  if (!slug) return;

  fetch('/_speexjs/admin/builder/api/pages/' + slug)
    .then(r => r.json())
    .then(res => {
      if (res.data) {
        document.getElementById('page-title').value = res.data.title;
        document.getElementById('page-slug').value = slug;
        components = res.data.components || [];
        nextId = components.length + 1;
        selectedIndex = -1;
        renderCanvas();
        showToast('✅ Page loaded!', 'success');
      } else {
        showToast('❌ Page not found', 'error');
      }
    }).catch(e => showToast('❌ Error: ' + e.message, 'error'));
}

function previewPage() {
  const slug = document.getElementById('page-slug').value;
  if (!slug) { showToast('❌ Save the page first', 'error'); return; }
  window.open('/pages/' + slug, '_blank');
}

function exportPage() {
  const slug = document.getElementById('page-slug').value;
  if (!slug) { showToast('❌ Save the page first', 'error'); return; }
  fetch('/_speexjs/admin/builder/api/export/' + slug)
    .then(r => r.text())
    .then(tsx => {
      const blob = new Blob([tsx], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = slug + '.tsx';
      a.click();
      URL.revokeObjectURL(url);
      showToast('📦 TSX exported!', 'success');
    }).catch(e => showToast('❌ Error: ' + e.message, 'error'));
}

function refreshPageList() {
  const container = document.getElementById('page-list');
  fetch('/_speexjs/admin/builder/api/pages')
    .then(r => r.json())
    .then(res => {
      const pages = res.data || [];
      if (pages.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#94a3b8;">No saved pages yet</div>';
        return;
      }
      container.innerHTML = pages.map(p =>
        '<div style="padding:10px;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:4px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;" onclick="loadPageBySlug(\\'' + p.slug + '\\')">' +
        '<div><strong>' + escapeHtml(p.title) + '</strong><br><span style="font-size:12px;color:#94a3b8;">/' + p.slug + '</span></div>' +
        '<button onclick="event.stopPropagation();deletePageBySlug(\\'' + p.slug + '\\')" style="padding:2px 8px;border:1px solid #fecaca;border-radius:4px;background:#fff;color:#ef4444;cursor:pointer;font-size:12px;">Delete</button>' +
        '</div>'
      ).join('');
    }).catch(() => {});
}

function loadPageBySlug(slug) {
  fetch('/_speexjs/admin/builder/api/pages/' + slug)
    .then(r => r.json())
    .then(res => {
      if (res.data) {
        document.getElementById('page-title').value = res.data.title;
        document.getElementById('page-slug').value = slug;
        components = res.data.components || [];
        nextId = components.length + 1;
        selectedIndex = -1;
        renderCanvas();
        showToast('✅ Page loaded!', 'success');
      }
    }).catch(() => {});
}

function deletePageBySlug(slug) {
  if (!confirm('Delete "' + slug + '"?')) return;
  fetch('/_speexjs/admin/builder/api/pages/' + slug, { method: 'DELETE' })
    .then(r => r.json())
    .then(() => { refreshPageList(); showToast('🗑️ Page deleted', 'success'); })
    .catch(() => {});
}

function addTableRow(index) {
  const c = components[index];
  if (!c || !c.props.headers) return;
  c.props.rows = c.props.rows || [];
  const row = c.props.headers.map(() => '');
  c.props.rows.push(row);
  renderCanvas();
}

function addFormField(index) {
  const c = components[index];
  if (!c) return;
  c.props.fields = c.props.fields || [];
  c.props.fields.push({ name: 'field' + (c.props.fields.length + 1), label: 'Field ' + (c.props.fields.length + 1), type: 'text' });
  renderCanvas();
}

function addNavLink(index) {
  const c = components[index];
  if (!c) return;
  c.props.links = c.props.links || [];
  c.props.links.push({ label: 'Link ' + (c.props.links.length + 1), href: '/' + (c.props.links.length + 1) });
  renderCanvas();
}

function showToast(msg, type) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3000);
}

function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// Init
document.getElementById('page-slug').addEventListener('input', function() {
  this.value = this.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '');
});
</script>
</body>
</html>`
}
