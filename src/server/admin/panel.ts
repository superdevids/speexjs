import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { SuperApp } from '../index.js'
import type { QueryBuilder } from '../database/query.js'

export interface AdminResource {
  name: string
  table: string
  label: string
  plural: string
  fields: AdminFieldDef[]
  relations?: AdminRelation[]
}

interface AdminFieldDef {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'email' | 'url' | 'text' | 'json' | 'enum' | 'image' | 'select'
  options?: string[]
  required?: boolean
  searchable?: boolean
  sortable?: boolean
  hidden?: boolean
}

interface AdminRelation {
  type: 'belongsTo' | 'hasMany' | 'belongsToMany'
  model: string
  foreignKey?: string
  label: string
}

const adminStyles = `body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;background:#f8fafc;color:#1e293b;}
.layout{display:flex;min-height:100vh;}
.sidebar{width:260px;background:#1e293b;color:#fff;padding:0;flex-shrink:0;}
.sidebar-header{padding:20px;border-bottom:1px solid #334155;}
.sidebar-header h1{font-size:18px;margin:0;}
.sidebar-header p{font-size:12px;color:#94a3b8;margin-top:4px;}
.sidebar-nav{padding:12px;}
.sidebar-nav a{display:block;padding:10px 14px;color:#cbd5e1;text-decoration:none;border-radius:8px;font-size:14px;margin-bottom:2px;transition:all .15s;}
.sidebar-nav a:hover{background:#334155;color:#fff;}
.sidebar-nav a.active{background:#3b82f6;color:#fff;}
.main{flex:1;padding:24px;}
.header{margin-bottom:24px;}
.header h1{font-size:24px;font-weight:700;margin:0 0 4px;}
.header p{color:#64748b;margin:0;font-size:14px;}
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;}
.card-header{padding:16px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
.card-header h2{margin:0;font-size:16px;font-weight:600;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;padding:12px 16px;font-size:12px;font-weight:600;text-transform:uppercase;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;}
td{padding:12px 16px;font-size:14px;border-bottom:1px solid #f1f5f9;}
tr:hover td{background:#f8fafc;}
.btn{display:inline-block;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;text-decoration:none;cursor:pointer;border:none;transition:all .15s;}
.btn-primary{background:#3b82f6;color:#fff;}
.btn-primary:hover{background:#2563eb;}
.btn-secondary{background:#fff;color:#475569;border:1px solid #e2e8f0;}
.btn-secondary:hover{background:#f8fafc;}
.btn-danger{background:#ef4444;color:#fff;}
.btn-danger:hover{background:#dc2626;}
.btn-sm{padding:4px 10px;font-size:12px;}
.flex{display:flex;}
.gap-2{gap:8px;}
.gap-4{gap:16px;}
.items-center{align-items:center;}
.justify-between{justify-content:space-between;}
.mb-4{margin-bottom:16px;}
.mb-6{margin-bottom:24px;}
.mt-4{margin-top:16px;}
.search-input{padding:8px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;width:280px;max-width:100%;}
.search-input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1);}
.pagination{display:flex;gap:4px;justify-content:center;padding:16px;align-items:center;}
.pagination a,.pagination span{padding:6px 12px;border-radius:6px;font-size:13px;text-decoration:none;}
.pagination a{border:1px solid #e2e8f0;color:#475569;}
.pagination a:hover{background:#f1f5f9;}
.pagination .active{background:#3b82f6;color:#fff;border-color:#3b82f6;}
.form-group{margin-bottom:16px;}
.form-group label{display:block;font-size:13px;font-weight:500;color:#374151;margin-bottom:4px;}
.form-group input,.form-group select,.form-group textarea{width:100%;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;box-sizing:border-box;}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1);}
.form-group textarea{min-height:80px;resize:vertical;}
.form-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:500;}
.badge-green{background:#dcfce7;color:#166534;}
.badge-red{background:#fef2f2;color:#991b1b;}
.badge-blue{background:#eff6ff;color:#1d4ed8;}
.grid{display:grid;gap:16px;}
.grid-2{grid-template-columns:1fr 1fr;}
.grid-3{grid-template-columns:1fr 1fr 1fr;}
.stat-card{padding:20px;text-align:center;}
.stat-card .value{font-size:32px;font-weight:700;color:#1e293b;}
.stat-card .label{font-size:13px;color:#64748b;margin-top:4px;}
.alert{padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;}
.alert-success{background:#dcfce7;color:#166534;border:1px solid #bbf7d0;}
.alert-error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}
.overflow-x{overflow-x:auto;}
.max-w-2xl{max-width:42rem;}
.mx-auto{margin-left:auto;margin-right:auto;}`

export class AdminPanel {
  private resources = new Map<string, AdminResource>()
  private db: any

  constructor() {
    /* resources registered via registerResource */
  }

  setDatabase(db: any): void {
    this.db = db
  }

  registerResource(resource: AdminResource): void {
    this.resources.set(resource.name, resource)
  }

  registerRoutes(app: SuperApp): void {
    app.get('/_speexjs/admin', async (ctx) => {
      const html = this.renderDashboard()
      ctx.response.type('text/html; charset=utf-8').send(html)
    })

    for (const [name, resource] of this.resources) {
      app.post(`/_speexjs/admin/${name}`, async (ctx) => {
        const request = ctx.request as any
        const body = await request.body()
        try {
          await this.insertRecord(resource, body)
          ctx.response.redirect(`/_speexjs/admin/${name}`)
        } catch (e: any) {
          ctx.response.html(this.renderCreateForm(resource, body, e.message))
        }
      })

      app.put(`/_speexjs/admin/${name}/:id`, async (ctx) => {
        const request = ctx.request as any
        const body = await request.body()
        try {
          await this.updateRecord(resource, ctx.params.id!, body)
          ctx.response.redirect(`/_speexjs/admin/${name}`)
        } catch (e: any) {
          ctx.response.html(this.renderEditForm(resource, ctx.params.id!, body, e.message))
        }
      })

      app.delete(`/_speexjs/admin/${name}/:id`, async (ctx) => {
        try {
          await this.deleteRecord(resource, ctx.params.id!)
          ctx.response.redirect(`/_speexjs/admin/${name}`)
        } catch {
          ctx.response.status(500).json({ error: 'Delete failed' })
        }
      })
    }

    for (const [name, resource] of this.resources) {
      app.get(`/_speexjs/admin/${name}`, async (ctx) => {
        const page = parseInt(String(ctx.query.page || '1'))
        const search = String(ctx.query.search || '')
        const html = await this.renderListView(resource, page, search)
        ctx.response.type('text/html; charset=utf-8').send(html)
      })

      app.get(`/_speexjs/admin/${name}/create`, async (ctx) => {
        const html = this.renderCreateForm(resource)
        ctx.response.type('text/html; charset=utf-8').send(html)
      })

      app.get(`/_speexjs/admin/${name}/:id/edit`, async (ctx) => {
        const record = await this.findRecord(resource, ctx.params.id!)
        const html = record ? this.renderEditForm(resource, ctx.params.id!, record) : this.renderNotFound(resource)
        ctx.response.type('text/html; charset=utf-8').send(html)
      })
    }
  }

  private async getQb(resource: AdminResource): Promise<QueryBuilder> {
    if (this.db) {
      return this.db.table(resource.table)
    }
    try {
      const { DatabaseConnection } = await import('../database/connection.js')
      const conn = new DatabaseConnection({
        driver: (process.env.DB_DRIVER as any) || 'sqlite',
        database: process.env.DB_DATABASE || 'speexjs',
      })
      await conn.connect()
      return conn.table(resource.table)
    } catch {
      throw new Error('Database not configured. Use setDatabase() or set DB_DRIVER/DB_DATABASE env vars.')
    }
  }

  private async findRecord(resource: AdminResource, id: string): Promise<any> {
    const qb = await this.getQb(resource)
    return qb.where('id', Number(id)).first()
  }

  private async insertRecord(resource: AdminResource, data: any): Promise<any> {
    const qb = await this.getQb(resource)
    const filtered: Record<string, any> = {}
    for (const field of resource.fields) {
      if (!field.hidden && data[field.name] !== undefined) {
        filtered[field.name] = data[field.name]
      }
    }
    return qb.insert(filtered)
  }

  private async updateRecord(resource: AdminResource, id: string, data: any): Promise<any> {
    const qb = await this.getQb(resource)
    const filtered: Record<string, any> = {}
    for (const field of resource.fields) {
      if (!field.hidden && data[field.name] !== undefined) {
        filtered[field.name] = data[field.name]
      }
    }
    return qb.where('id', Number(id)).update(filtered)
  }

  private async deleteRecord(resource: AdminResource, id: string): Promise<any> {
    const qb = await this.getQb(resource)
    return qb.where('id', Number(id)).delete()
  }

  private async listRecords(
    resource: AdminResource,
    page: number,
    search: string,
  ): Promise<{ data: any[]; total: number; page: number; perPage: number; lastPage: number }> {
    const perPage = 15
    const qb = await this.getQb(resource)
    if (search) {
      const searchable = resource.fields.filter((f) => f.searchable !== false && f.type !== 'json' && f.type !== 'boolean').slice(0, 3)
      if (searchable.length > 0) {
        qb.where(searchable[0]!.name, 'like', `%${search}%`)
        for (let i = 1; i < searchable.length; i++) {
          qb.orWhere(searchable[i]!.name, 'like', `%${search}%`)
        }
      }
    }
    qb.orderBy('id', 'desc')
    const result = await qb.paginate(perPage, page)
    return { data: result.data, total: result.total, page: result.currentPage, perPage: result.perPage, lastPage: result.lastPage }
  }

  private renderDashboard(): string {
    const resources = Array.from(this.resources.values())
    const cards = resources
      .map(
        (r) =>
          `<div class="stat-card card"><div class="value">${(r.name ?? '')[0]?.toUpperCase() ?? ''}</div><div class="label">${r.plural || (r.name ?? '') + 's'}</div><a href="/_speexjs/admin/${r.name ?? ''}" class="btn btn-primary btn-sm" style="margin-top:12px;">Manage</a></div>`,
      )
      .join('')
    const navLinks = resources.map((r) => `<a href="/_speexjs/admin/${r.name ?? ''}">${r.plural || (r.name ?? '') + 's'}</a>`).join('\n')
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Admin - SpeexJS</title><style>${adminStyles}</style></head><body><div class="layout"><div class="sidebar"><div class="sidebar-header"><h1>SpeexJS Admin</h1><p>v5.0</p></div><div class="sidebar-nav"><a href="/_speexjs/admin" class="active">Dashboard</a>${navLinks}${resources.length > 0 ? '<div style="border-top:1px solid #334155;margin:12px 0;padding-top:12px;"><a href="/_speexjs/admin/builder" style="color:#94a3b8;">🧩 Page Builder</a></div>' : ''}</div></div><div class="main"><div class="header"><h1>Dashboard</h1><p>${resources.length} registered resources</p></div>${resources.length === 0 ? '<div class="card" style="padding:40px;text-align:center;"><p style="color:#94a3b8;">No resources registered. Use adminPanel.registerResource() to add models.</p></div>' : `<div class="grid grid-${Math.min(resources.length, 3)}">${cards}</div>`}<div class="card" style="margin-top:24px;padding:20px;"><h2 style="font-size:14px;font-weight:600;margin:0 0 12px;">Quick Actions</h2><div class="flex gap-2">${resources.map((r) => `<a href="/_speexjs/admin/${r.name}/create" class="btn btn-primary btn-sm">+ New ${r.label || r.name}</a>`).join('')}</div></div></div></div></body></html>`
  }

  private async renderListView(resource: AdminResource, page: number, search: string): Promise<string> {
    const result = await this.listRecords(resource, page, search)
    const displayFields = resource.fields.filter((f) => !f.hidden).slice(0, 6)
    const navLinks = Array.from(this.resources.values())
      .map((r) => `<a href="/_speexjs/admin/${r.name}"${r.name === resource.name ? ' class="active"' : ''}>${r.plural || r.name + 's'}</a>`)
      .join('\n')

    const rows = result.data
      .map((record: any) => {
        const cells = displayFields
          .map((f) => {
            let val = record[f.name]
            if (val === null || val === undefined) return '<span style="color:#94a3b8;">—</span>'
            if (f.type === 'boolean') return val ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-red">No</span>'
            if (f.type === 'date' && val) {
              try {
                val = new Date(val).toLocaleDateString()
              } catch {}
            }
            if (typeof val === 'object') val = JSON.stringify(val).slice(0, 50) + '…'
            return String(val).slice(0, 50)
          })
          .join('</td><td>')
        return `<tr><td>${cells}</td><td style="text-align:right;"><a href="/_speexjs/admin/${resource.name}/${record.id}/edit" class="btn btn-secondary btn-sm">Edit</a></td></tr>`
      })
      .join('\n')

    let pagination = ''
    if (result.lastPage > 1) {
      const pLinks: string[] = []
      for (let i = 1; i <= result.lastPage; i++) {
        if (i === result.page) {
          pLinks.push(`<span class="active">${i}</span>`)
        } else {
          const searchParam = search ? `&search=${encodeURIComponent(search)}` : ''
          pLinks.push(`<a href="/_speexjs/admin/${resource.name}?page=${i}${searchParam}">${i}</a>`)
        }
      }
      pagination = `<div class="pagination">${pLinks.join('')}</div>`
    }

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${resource.plural || resource.name + 's'} - Admin</title><style>${adminStyles}</style></head><body><div class="layout"><div class="sidebar"><div class="sidebar-header"><h1>SpeexJS Admin</h1><p>v5.0</p></div><div class="sidebar-nav"><a href="/_speexjs/admin">Dashboard</a>${navLinks}</div></div><div class="main"><div class="header"><div class="flex items-center justify-between"><div><h1>${resource.plural || resource.name + 's'}</h1><p>${result.total} total records</p></div><a href="/_speexjs/admin/${resource.name}/create" class="btn btn-primary">+ New ${resource.label || resource.name}</a></div></div><div class="card"><div class="card-header"><h2>All ${resource.plural || resource.name + 's'}</h2><form method="GET" action="/_speexjs/admin/${resource.name}" style="display:flex;gap:8px;"><input type="text" name="search" class="search-input" placeholder="Search..." value="${escHtml(search)}" /><button type="submit" class="btn btn-secondary">Search</button></form></div><div class="overflow-x"><table><thead><tr>${displayFields.map((f) => `<th>${f.label || f.name}</th>`).join('')}<th style="text-align:right;">Actions</th></tr></thead><tbody>${rows || '<tr><td colspan="99" style="text-align:center;padding:40px;color:#94a3b8;">No records found</td></tr>'}</tbody></table></div>${pagination}</div></div></div></body></html>`
  }

  private renderCreateForm(resource: AdminResource, data: any = {}, error: string | null = null): string {
    return this.renderForm(resource, data, null, 'Create', `/_speexjs/admin/${resource.name}`, 'POST', error)
  }

  private renderEditForm(resource: AdminResource, id: string, data: any = {}, error: string | null = null): string {
    return this.renderForm(resource, data, id, 'Update', `/_speexjs/admin/${resource.name}/${id}`, 'PUT', error)
  }

  private renderForm(
    resource: AdminResource,
    data: any,
    id: string | null,
    action: string,
    submitUrl: string,
    method: string,
    error: string | null,
  ): string {
    const navLinks = Array.from(this.resources.values())
      .map((r) => `<a href="/_speexjs/admin/${r.name}">${r.plural || r.name + 's'}</a>`)
      .join('\n')
    const fields = resource.fields
      .filter((f) => !f.hidden)
      .map((f) => {
        const val = data[f.name] !== undefined ? String(data[f.name]) : ''
        let input = ''
        if (f.type === 'boolean') {
          input = `<select name="${f.name}"><option value="0"${val === '0' || val === 'false' || !val ? ' selected' : ''}>No</option><option value="1"${val === '1' || val === 'true' ? ' selected' : ''}>Yes</option></select>`
        } else if (f.type === 'enum' && f.options) {
          const opts = f.options.map((o) => `<option value="${escHtml(o)}"${val === o ? ' selected' : ''}>${escHtml(o)}</option>`).join('')
          input = `<select name="${f.name}"><option value="">— Select —</option>${opts}</select>`
        } else if (f.type === 'text') {
          input = `<textarea name="${f.name}"${f.required ? ' required' : ''}>${escHtml(val)}</textarea>`
        } else if (f.type === 'email') {
          input = `<input type="email" name="${f.name}" value="${escHtml(val)}"${f.required ? ' required' : ''} />`
        } else if (f.type === 'number') {
          input = `<input type="number" name="${f.name}" value="${escHtml(val)}"${f.required ? ' required' : ''} step="any" />`
        } else {
          input = `<input type="${f.type === 'date' ? 'datetime-local' : 'text'}" name="${f.name}" value="${escHtml(val)}"${f.required ? ' required' : ''} />`
        }
        return `<div class="form-group"><label>${f.label || f.name}</label>${input}</div>`
      })
      .join('\n')

    const errorHtml = error ? `<div class="alert alert-error">${escHtml(error)}</div>` : ''

    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${action} ${resource.label || resource.name} - Admin</title><style>${adminStyles}</style></head><body><div class="layout"><div class="sidebar"><div class="sidebar-header"><h1>SpeexJS Admin</h1><p>v5.0</p></div><div class="sidebar-nav"><a href="/_speexjs/admin">Dashboard</a>${navLinks}</div></div><div class="main"><div class="header"><h1>${action} ${resource.label || resource.name}</h1></div><div class="card max-w-2xl mx-auto"><div style="padding:24px;">${errorHtml}<form action="${submitUrl}" method="POST"${method === 'PUT' ? `><input type="hidden" name="_method" value="PUT"` : '>'}><input type="hidden" name="id" value="${id || ''}" />${fields}<div class="form-actions"><a href="/_speexjs/admin/${resource.name}" class="btn btn-secondary">Cancel</a><button type="submit" class="btn btn-primary">${action}</button></div></form></div></div></div></div></body></html>`
  }

  private renderNotFound(resource: AdminResource): string {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Not Found - Admin</title><style>${adminStyles}</style></head><body><div class="layout"><div class="main" style="text-align:center;padding:80px;"><h1>404</h1><p>Record not found</p><a href="/_speexjs/admin/${resource.name}" class="btn btn-primary">Back</a></div></div></body></html>`
  }
}

function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function generateAdminConfig(name: string, fields: string[]): void {
  const targetDir = resolve(process.cwd(), 'src/admin')
  mkdirSync(targetDir, { recursive: true })

  const fieldDefs = fields
    .map((f) => {
      const [n, t = 'string'] = f.split(':')
      return `{ name: '${n!}', label: '${n!.charAt(0).toUpperCase() + n!.slice(1)}', type: '${t}' as const }`
    })
    .join(',\n    ')

  const content = `import { AdminPanel } from 'speexjs/server/admin'

const admin = new AdminPanel()

admin.registerResource({
  name: '${name}',
  table: '${name}s',
  label: '${name.charAt(0).toUpperCase() + name.slice(1)}',
  plural: '${name.charAt(0).toUpperCase() + name.slice(1)}s',
  fields: [
    ${fieldDefs}
  ],
})

export default admin
`
  const filePath = resolve(targetDir, `${name}.admin.ts`)
  writeFileSync(filePath, content, 'utf-8')
  console.log(`✅ Admin config created at ${filePath}`)
}
