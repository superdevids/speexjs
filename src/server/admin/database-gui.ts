import type { DatabaseConnection } from '../database/connection.js'
import type { QueryResult } from '../database/types.js'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncateValue(val: unknown): string {
  if (val === null || val === undefined) return '<span class="null">NULL</span>'
  const s = String(val)
  if (s.length > 200) return escapeHtml(s.slice(0, 200)) + '&hellip;'
  return escapeHtml(s)
}

async function getTables(db: DatabaseConnection): Promise<string[]> {
  const driver = db.getDriver()
  try {
    if (driver === 'sqlite') {
      const result = await db.raw("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      return result.rows.map((r: any) => r.name as string)
    }
    if (driver === 'postgresql') {
      const result = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name")
      return result.rows.map((r: any) => r.table_name as string)
    }
    const result = await db.raw('SHOW TABLES')
    const key = Object.keys(result.rows[0] ?? {})[0] ?? `Tables_in_${(db as any)._config?.database ?? 'db'}`
    return result.rows.map((r: any) => r[key] as string)
  } catch {
    return []
  }
}

async function getTableSchema(
  db: DatabaseConnection,
  table: string,
): Promise<{ name: string; type: string; nullable: boolean; key: string; default: string | null }[]> {
  const driver = db.getDriver()
  try {
    if (driver === 'sqlite') {
      const result = await db.raw(`PRAGMA table_info("${table.replace(/"/g, '""')}")`)
      return result.rows.map((r: any) => ({
        name: r.name as string,
        type: (r.type as string) ?? 'TEXT',
        nullable: !r.notnull,
        key: r.pk ? 'PRI' : '',
        default: r.dflt_value as string | null,
      }))
    }
    if (driver === 'postgresql') {
      const result = await db.raw(
        `SELECT column_name, data_type, is_nullable, COALESCE(character_maximum_length::text, '') AS char_len,
                COALESCE(column_default, '') AS col_default
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position`,
        [table],
      )
      return result.rows.map((r: any) => ({
        name: r.column_name as string,
        type: r.data_type as string,
        nullable: r.is_nullable === 'YES',
        key: '',
        default: r.col_default || null,
      }))
    }
    const result = await db.raw(`DESCRIBE \`${table.replace(/`/g, '``')}\``)
    return result.rows.map((r: any) => ({
      name: r.Field as string,
      type: r.Type as string,
      nullable: (r.Null as string) === 'YES',
      key: (r.Key as string) ?? '',
      default: r.Default as string | null,
    }))
  } catch {
    return []
  }
}

async function getIndexes(db: DatabaseConnection, table: string): Promise<{ name: string; columns: string[]; unique: boolean }[]> {
  const driver = db.getDriver()
  try {
    if (driver === 'sqlite') {
      const result = await db.raw(`PRAGMA index_list("${table.replace(/"/g, '""')}")`)
      const indexes: { name: string; columns: string[]; unique: boolean }[] = []
      for (const row of result.rows) {
        const info = await db.raw(`PRAGMA index_info("${(row.name as string).replace(/"/g, '""')}")`)
        const columns = info.rows.map((r: any) => r.name as string)
        indexes.push({ name: row.name as string, columns, unique: !!row.unique })
      }
      return indexes
    }
    if (driver === 'postgresql') {
      const result = await db.raw(
        `SELECT i.relname AS index_name, a.attname AS column_name, ix.indisunique AS unique
         FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
         WHERE t.oid = ix.indrelid AND i.oid = ix.indexrelid AND a.attrelid = t.oid
           AND a.attnum = ANY(ix.indkey) AND t.relname = $1
         ORDER BY i.relname, a.attnum`,
        [table],
      )
      const map = new Map<string, { columns: string[]; unique: boolean }>()
      for (const row of result.rows) {
        const name = row.index_name as string
        if (!map.has(name)) map.set(name, { columns: [], unique: !!row.unique })
        map.get(name)!.columns.push(row.column_name as string)
      }
      return [...map.entries()].map(([name, info]) => ({ name, ...info }))
    }
    const result = await db.raw(`SHOW INDEX FROM \`${table.replace(/`/g, '``')}\``)
    const map = new Map<string, { columns: string[]; unique: boolean }>()
    for (const row of result.rows) {
      const name = row.Key_name as string
      if (!map.has(name)) map.set(name, { columns: [], unique: !row.Non_unique })
      map.get(name)!.columns.push(row.Column_name as string)
    }
    return [...map.entries()].map(([name, info]) => ({ name, ...info }))
  } catch {
    return []
  }
}

async function previewTable(db: DatabaseConnection, table: string, limit = 50): Promise<QueryResult> {
  const driver = db.getDriver()
  const t = table.replace(/"/g, '""')
  if (driver === 'postgresql') {
    return db.raw(`SELECT * FROM "${t}" LIMIT ${limit}`)
  }
  if (driver === 'sqlite') {
    return db.raw(`SELECT * FROM "${t}" LIMIT ${limit}`)
  }
  return db.raw(`SELECT * FROM \`${table.replace(/`/g, '``')}\` LIMIT ${limit}`)
}

export interface DbGuiState {
  message: string
  messageType: 'success' | 'error'
  lastQuery: string
  lastResult: QueryResult | null
}

let guiState: DbGuiState = { message: '', messageType: 'success', lastQuery: '', lastResult: null }

export function setGuiState(state: Partial<DbGuiState>): void {
  guiState = { ...guiState, ...state }
}

export function getGuiState(): DbGuiState {
  return guiState
}

function generateQueryResultHtml(result: QueryResult): string {
  if (!result.rows || result.rows.length === 0) {
    return '<p style="color:#8b949e">Query returned no rows.</p>'
  }

  const columns =
    result.fields && result.fields.length > 0
      ? (result.fields as any[]).map((f: any) => (typeof f === 'object' ? (f.name ?? f.orgName ?? '?') : String(f)))
      : Object.keys(result.rows[0] ?? {})

  const headers = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')
  const rows = result.rows
    .map((row: any) => {
      const cells = columns.map((col) => `<td>${truncateValue(row[col])}</td>`).join('')
      return `<tr>${cells}</tr>`
    })
    .join('\n')

  return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
<p style="color:#8b949e;font-size:0.8rem;margin-top:0.5rem">${result.rows.length} row(s) returned</p>`
}

function generateSchemaHtml(schema: { name: string; type: string; nullable: boolean; key: string; default: string | null }[]): string {
  if (schema.length === 0) return '<p style="color:#8b949e">No columns found.</p>'
  const rows = schema
    .map((c) => {
      const nullableIcon = c.nullable ? '<span style="color:#3fb950">YES</span>' : '<span style="color:#f85149">NO</span>'
      const keyBadge = c.key ? `<span class="badge">${escapeHtml(c.key)}</span>` : ''
      return `<tr><td class="mono">${escapeHtml(c.name)}</td><td class="mono">${escapeHtml(c.type)}</td><td>${nullableIcon}${keyBadge}</td><td class="mono muted">${c.default !== null ? escapeHtml(c.default) : '<span class="muted">—</span>'}</td></tr>`
    })
    .join('\n')
  return `<table><thead><tr><th>Column</th><th>Type</th><th>Nullable</th><th>Default</th></tr></thead><tbody>${rows}</tbody></table>`
}

function generateIndexesHtml(indexes: { name: string; columns: string[]; unique: boolean }[]): string {
  if (indexes.length === 0) return '<p style="color:#8b949e">No indexes defined.</p>'
  const rows = indexes
    .map((ix) => {
      const uniqueBadge = ix.unique ? '<span class="badge unique">UNIQUE</span>' : ''
      return `<tr><td class="mono">${escapeHtml(ix.name)}</td><td class="mono">${ix.columns.map((c) => escapeHtml(c)).join(', ')}</td><td>${uniqueBadge}</td></tr>`
    })
    .join('\n')
  return `<table><thead><tr><th>Name</th><th>Columns</th><th>Type</th></tr></thead><tbody>${rows}</tbody></table>`
}

export async function generateDatabaseGuiHtml(db: DatabaseConnection, action: string, params: Record<string, string>): Promise<string> {
  const tables = await getTables(db)
  let mainContent = ''
  let stateMessage = guiState.message
  let stateType = guiState.messageType

  if (action === 'table' && params.table) {
    const table = params.table
    const schema = await getTableSchema(db, table)
    const indexes = await getIndexes(db, table)
    const preview = await previewTable(db, table, 20)

    const schemaHtml = generateSchemaHtml(schema)
    const indexesHtml = generateIndexesHtml(indexes)
    const previewHtml = generateQueryResultHtml(preview)

    mainContent = `
<div class="section">
  <h2>Table: ${escapeHtml(table)} <span class="subtitle" style="font-weight:400;font-size:0.85rem">${schema.length} columns, ${indexes.length} indexes</span></h2>
  <form class="query-form" action="/_speexjs/admin/db" method="get" style="margin-bottom:1rem">
    <input type="hidden" name="table" value="${escapeHtml(table)}" />
  </form>
</div>
<div class="section">
  <h3>Schema</h3>
  ${schemaHtml}
</div>
<div class="section">
  <h3>Indexes</h3>
  ${indexesHtml}
</div>
<div class="section">
  <h3>Preview <span class="subtitle" style="font-weight:400;font-size:0.8rem;color:#8b949e">(first 20 rows)</span></h3>
  ${previewHtml}
</div>`
  } else if (action === 'query') {
    const result = guiState.lastResult
    mainContent = `
<div class="section">
  <h2>Query Result</h2>
  ${stateMessage ? `<div class="msg msg-${stateType}">${escapeHtml(stateMessage)}</div>` : ''}
  <div class="query-sql">${escapeHtml(guiState.lastQuery)}</div>
  ${result ? generateQueryResultHtml(result) : '<p style="color:#8b949e">No result.</p>'}
  ${
    result && result.rows.length > 0
      ? `<div style="margin-top:0.75rem">
    <a class="btn" href="/_speexjs/admin/db/export?format=json">Export JSON</a>
    <a class="btn" href="/_speexjs/admin/db/export?format=csv">Export CSV</a>
  </div>`
      : ''
  }
</div>`
  } else {
    const tableCards = await Promise.all(
      tables.slice(0, 50).map(async (t) => {
        const schema = await getTableSchema(db, t)
        const preview = await previewTable(db, t, 5)
        let count = preview.rows.length
        try {
          const driver = db.getDriver()
          if (driver === 'postgresql') {
            const c = await db.raw(`SELECT COUNT(*) AS cnt FROM "${t.replace(/"/g, '""')}"`)
            count = Number(c.rows[0]?.cnt ?? count)
          } else if (driver === 'sqlite') {
            const c = await db.raw(`SELECT COUNT(*) AS cnt FROM "${t.replace(/"/g, '""')}"`)
            count = Number(c.rows[0]?.cnt ?? count)
          } else {
            const c = await db.raw(`SELECT COUNT(*) AS cnt FROM \`${t.replace(/`/g, '``')}\``)
            count = Number(c.rows[0]?.cnt ?? count)
          }
        } catch {
          /* ignore */
        }
        const cols = schema.map((c) => escapeHtml(c.name)).join(', ')
        return `<a href="/_speexjs/admin/db?table=${encodeURIComponent(t)}" class="table-card">
  <div class="table-name">${escapeHtml(t)}</div>
  <div class="table-meta">${schema.length} columns · ${count} rows</div>
  <div class="table-cols">${cols || '—'}</div>
</a>`
      }),
    )

    mainContent = `
<div class="section">
  <h2>Tables <span class="subtitle" style="font-weight:400;font-size:0.85rem;color:#8b949e">${tables.length} total</span></h2>
  <div class="table-grid">
    ${tableCards.join('\n')}
  </div>
</div>`
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Database GUI – SpeexJS</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem}
  .wrap{max-width:1100px;margin:0 auto}
  h1{font-size:1.75rem;color:#f0f6fc;margin-bottom:0.25rem}
  .subtitle{color:#8b949e}
  .nav{display:flex;gap:1rem;align-items:center;margin-bottom:2rem;padding-bottom:0.75rem;border-bottom:1px solid #21262d}
  .nav a{color:#58a6ff;text-decoration:none;font-size:0.9rem}
  .nav a:hover{text-decoration:underline}
  .nav .spacer{flex:1}
  .section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.25rem;margin-bottom:1.25rem}
  .section h2{font-size:1.1rem;color:#f0f6fc;margin-bottom:1rem}
  .section h3{font-size:0.95rem;color:#f0f6fc;margin-bottom:0.75rem;margin-top:0.5rem}
  table{width:100%;border-collapse:collapse;font-size:0.85rem}
  th{text-align:left;padding:0.5rem 0.75rem;color:#8b949e;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #21262d}
  td{padding:0.4rem 0.75rem;border-bottom:1px solid #21262d}
  tr:hover td{background:#1c2128}
  .mono{font-family:'JetBrains Mono','Fira Code',monospace;font-size:0.8rem}
  .muted{color:#8b949e}
  .null{color:#8b949e;font-style:italic}
  .badge{display:inline-block;padding:0.1rem 0.4rem;border-radius:4px;font-size:0.7rem;background:#1f6feb22;color:#58a6ff;border:1px solid #1f6feb44;margin-left:0.4rem}
  .badge.unique{background:#23863622;color:#3fb950;border-color:#23863644}
  .table-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:0.75rem}
  .table-card{display:block;background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:0.75rem 1rem;text-decoration:none;transition:border-color 0.2s}
  .table-card:hover{border-color:#58a6ff}
  .table-name{font-weight:600;color:#f0f6fc;font-size:0.9rem;margin-bottom:0.2rem}
  .table-meta{font-size:0.75rem;color:#8b949e;margin-bottom:0.3rem}
  .table-cols{font-size:0.7rem;color:#484f58;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .query-form{display:flex;gap:0.5rem}
  .query-form textarea{flex:1;background:#0d1117;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;padding:0.6rem;font-family:'JetBrains Mono',monospace;font-size:0.85rem;resize:vertical;min-height:60px}
  .query-form textarea:focus{outline:none;border-color:#58a6ff}
  .btn{display:inline-block;padding:0.4rem 0.9rem;border-radius:6px;font-size:0.8rem;font-weight:500;cursor:pointer;border:1px solid #30363d;background:#21262d;color:#c9d1d9;text-decoration:none}
  .btn:hover{background:#30363d}
  .btn-primary{background:#238636;border-color:#238636;color:#fff}
  .btn-primary:hover{background:#2ea043}
  .msg{padding:0.6rem 0.9rem;border-radius:6px;font-size:0.85rem;margin-bottom:0.75rem}
  .msg-success{background:#23863622;border:1px solid #23863644;color:#3fb950}
  .msg-error{background:#f8514922;border:1px solid #f8514944;color:#f85149}
  .query-sql{background:#0d1117;border:1px solid #30363d;border-radius:6px;padding:0.6rem;font-family:'JetBrains Mono',monospace;font-size:0.8rem;color:#79c0ff;margin-bottom:0.75rem;overflow-x:auto}
  p{color:#8b949e;font-size:0.875rem}
</style>
</head>
<body>
<div class="wrap">
  <h1>Database GUI</h1>
  <p class="subtitle">Browse tables, view schema, run queries</p>
  <div class="nav">
    <a href="/_speexjs/admin/db">Tables</a>
    <a href="/_speexjs/admin/db?query=1">SQL Query</a>
    <span class="spacer"></span>
    <span style="font-size:0.75rem;color:#8b949e">${db.getDriver()} · ${db.getConfig().database}</span>
  </div>
  ${
    action === 'query'
      ? `<div class="section">
  <h2>Run SQL Query</h2>
  <p style="margin-bottom:0.75rem">Only SELECT queries are allowed in safe mode.</p>
  <form class="query-form" action="/_speexjs/admin/db/query" method="post">
    <textarea name="sql" placeholder="SELECT * FROM ...">${escapeHtml(params.sql || '')}</textarea>
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      <button type="submit" class="btn btn-primary">Run</button>
    </div>
  </form>
</div>`
      : ''
  }
  ${stateMessage ? `<div class="msg msg-${stateType}">${escapeHtml(stateMessage)}</div>` : ''}
  ${mainContent}
</div>
</body>
</html>`
}
