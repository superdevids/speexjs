import * as os from 'node:os'
import type { DatabaseConnection } from '../database/connection'

interface QueryEntry {
  sql: string
  bindings?: any[]
  duration: number
  timestamp: number
}

interface RateLimitEvent {
  ip: string
  blocked: boolean
  count: number
  max: number
  timestamp: number
  path?: string
}

const MAX_QUERIES = 100
const queryBuffer: QueryEntry[] = []
const MAX_RATE_LIMIT_EVENTS = 200
const rateLimitEvents: RateLimitEvent[] = []

export function trackQuery(sql: string, duration: number, bindings?: any[]): void {
  queryBuffer.push({ sql, bindings, duration, timestamp: Date.now() })
  if (queryBuffer.length > MAX_QUERIES) {
    queryBuffer.splice(0, queryBuffer.length - MAX_QUERIES)
  }
}

export function getRecentQueries(): QueryEntry[] {
  return [...queryBuffer]
}

export function clearQueries(): void {
  queryBuffer.length = 0
}

export function trackRateLimitEvent(ip: string, blocked: boolean, count: number, max: number): void {
  rateLimitEvents.push({ ip, blocked, count, max, timestamp: Date.now() })
  if (rateLimitEvents.length > MAX_RATE_LIMIT_EVENTS) {
    rateLimitEvents.splice(0, rateLimitEvents.length - MAX_RATE_LIMIT_EVENTS)
  }
}

export function getRateLimitEvents(): RateLimitEvent[] {
  return [...rateLimitEvents]
}

export function clearRateLimitEvents(): void {
  rateLimitEvents.length = 0
}

export function wrapConnection(connection: DatabaseConnection): DatabaseConnection {
  const originalRaw = connection.raw.bind(connection)
  connection.raw = async (sql: string, bindings?: any[]) => {
    const start = Date.now()
    try {
      return await originalRaw(sql, bindings)
    } finally {
      const duration = Date.now() - start
      trackQuery(sql, duration, bindings)
    }
  }
  return connection
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`
  if (ms >= 1) return `${ms.toFixed(0)}ms`
  return `${(ms * 1000).toFixed(0)}us`
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${bytes} B`
}

function getSystemInfo() {
  const mem = process.memoryUsage()
  const uptimeSeconds = process.uptime()
  const days = Math.floor(uptimeSeconds / 86400)
  const hours = Math.floor((uptimeSeconds % 86400) / 3600)
  const minutes = Math.floor((uptimeSeconds % 3600) / 60)
  const uptimeStr = days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`

  const cpus = os.cpus()
  const cpuModel = cpus.length > 0 ? (cpus[0]?.model ?? 'unknown') : 'unknown'

  return {
    nodeVersion: process.version,
    memoryUsage: `RSS: ${formatBytes(mem.rss)} | Heap: ${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}`,
    uptime: uptimeStr,
    platform: `${process.platform} (${process.arch})`,
    cpu: `${cpuModel} (${cpus.length} cores)`,
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function truncateSql(sql: string): string {
  if (sql.length > 120) return sql.slice(0, 120) + '...'
  return sql
}

export function generateDashboardHtml(
  routes: { method: string; path: string; middlewareCount: number }[],
  queries: QueryEntry[],
  cacheStats: { hits: number; misses: number; keys: number; size: string } | null,
  config: Record<string, unknown>,
): string {
  const sys = getSystemInfo()
  const methodColors: Record<string, string> = {
    GET: '#1f6feb',
    POST: '#238636',
    PUT: '#d29922',
    PATCH: '#d29922',
    DELETE: '#f85149',
    OPTIONS: '#8b949e',
    HEAD: '#8b949e',
  }

  const routeRows = routes
    .map((r) => {
      const color = methodColors[r.method] || '#8b949e'
      return `<tr><td><span class="method" style="background:${color}22;color:${color}">${r.method}</span></td><td class="mono">${escapeHtml(r.path)}</td><td>${r.middlewareCount}</td></tr>`
    })
    .join('\n')

  const queryRows = queries
    .slice()
    .reverse()
    .map((q) => {
      const dc = q.duration > 100 ? '#f85149' : q.duration > 30 ? '#d29922' : '#3fb950'
      return `<tr><td class="muted nowrap">${new Date(q.timestamp).toLocaleTimeString()}</td><td class="mono break">${escapeHtml(truncateSql(q.sql))}</td><td class="mono right" style="color:${dc}">${formatDuration(q.duration)}</td></tr>`
    })
    .join('\n')

  const configRows = Object.entries(config)
    .map(([k, v]) => {
      const val = typeof v === 'object' ? JSON.stringify(v) : String(v)
      return `<tr><td class="mono">${escapeHtml(k)}</td><td class="mono" style="color:#79c0ff">${escapeHtml(val)}</td></tr>`
    })
    .join('\n')

  const sysRows = [
    ['Node Version', sys.nodeVersion],
    ['Platform', sys.platform],
    ['Memory', sys.memoryUsage],
    ['CPU', sys.cpu],
    ['Uptime', sys.uptime],
  ]
    .map(([k, v]) => `<tr><td>${k}</td><td class="mono">${v}</td></tr>`)
    .join('\n')

  const rlEvents = getRateLimitEvents()
  const totalBlocked = rlEvents.filter((e) => e.blocked).length
  const topOffenders: Record<string, { blocked: number; total: number }> = {}
  for (const e of rlEvents) {
    let entry = topOffenders[e.ip]
    if (!entry) {
      entry = { blocked: 0, total: 0 }
      topOffenders[e.ip] = entry
    }
    entry.total++
    if (e.blocked) entry.blocked++
  }
  const topOffenderList = Object.entries(topOffenders)
    .sort((a, b) => b[1].blocked - a[1].blocked)
    .slice(0, 10)

  const rlRows = rlEvents
    .slice()
    .reverse()
    .slice(0, 50)
    .map((e) => {
      const statusColor = e.blocked ? '#f85149' : '#3fb950'
      return `<tr><td class="muted nowrap">${new Date(e.timestamp).toLocaleTimeString()}</td><td class="mono">${escapeHtml(e.ip)}</td><td class="mono" style="color:${statusColor}">${e.blocked ? 'BLOCKED' : 'OK'}</td><td class="mono right">${e.count}/${e.max}</td></tr>`
    })
    .join('\n')

  const topOffenderRows = topOffenderList
    .map(
      ([ip, stats]) =>
        `<tr><td class="mono">${escapeHtml(ip)}</td><td class="mono right">${stats.total}</td><td class="mono right" style="color:#f85149">${stats.blocked}</td></tr>`,
    )
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SpeexJS Dev Dashboard</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem}
  .wrap{max-width:1200px;margin:0 auto}
  h1{font-size:1.75rem;color:#f0f6fc;margin-bottom:0.25rem}
  .subtitle{color:#8b949e;font-size:0.875rem;margin-bottom:2rem}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:1rem;margin-bottom:2rem}
  .stat{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1rem}
  .stat .lbl{font-size:0.75rem;color:#8b949e;text-transform:uppercase;letter-spacing:0.05em}
  .stat .val{font-size:1.5rem;font-weight:700;color:#f0f6fc;margin-top:0.25rem}
  .stat .sub{font-size:0.75rem;color:#8b949e;margin-top:0.25rem}
  .section{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1.5rem;margin-bottom:1.5rem}
  .section h2{font-size:1.1rem;color:#f0f6fc;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid #21262d}
  table{width:100%;border-collapse:collapse;font-size:0.875rem}
  th{text-align:left;padding:0.5rem 0.75rem;color:#8b949e;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #21262d}
  td{padding:0.5rem 0.75rem;border-bottom:1px solid #21262d}
  tr:hover td{background:#1c2128}
  p{color:#8b949e;font-size:0.875rem}
  .mono{font-family:'JetBrains Mono','Fira Code',monospace;font-size:0.8rem}
  .muted{color:#8b949e}
  .nowrap{white-space:nowrap}
  .right{text-align:right}
  .break{word-break:break-all}
  .method{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-weight:600;font-size:0.75rem;text-transform:uppercase}
</style>
</head>
<body>
<div class="wrap">
  <h1>SpeexJS Dev Dashboard</h1>
  <p class="subtitle">Framework Debug Interface</p>
  <div class="grid">
    <div class="stat"><div class="lbl">Routes</div><div class="val">${routes.length}</div></div>
    <div class="stat"><div class="lbl">Queries</div><div class="val">${queries.length}</div></div>
    <div class="stat"><div class="lbl">Rate Limit Events</div><div class="val">${rlEvents.length}</div><div class="sub">Blocked: ${totalBlocked}</div></div>
    <div class="stat"><div class="lbl">Cache Hits</div><div class="val">${cacheStats?.hits ?? '-'}</div><div class="sub">Misses: ${cacheStats?.misses ?? '-'}</div></div>
    <div class="stat"><div class="lbl">Cache Keys</div><div class="val">${cacheStats?.keys ?? '-'}</div><div class="sub">Size: ${cacheStats?.size ?? '-'}</div></div>
    <div class="stat"><div class="lbl">Node.js</div><div class="val" style="font-size:1.25rem">${sys.nodeVersion}</div></div>
    <div class="stat"><div class="lbl">Uptime</div><div class="val" style="font-size:1.25rem">${sys.uptime}</div></div>
  </div>
  <div class="section">
    <h2>Registered Routes</h2>
    ${routes.length > 0 ? `<table><thead><tr><th>Method</th><th>Path</th><th>Middleware</th></tr></thead><tbody>${routeRows}</tbody></table>` : '<p>No routes registered.</p>'}
  </div>
  <div class="section">
    <h2>Database Queries <span style="color:#8b949e;font-weight:400;font-size:0.8rem">(last ${queries.length})</span></h2>
    ${queries.length > 0 ? `<table><thead><tr><th>Time</th><th>SQL</th><th style="text-align:right">Duration</th></tr></thead><tbody>${queryRows}</tbody></table>` : '<p>No queries executed yet.</p>'}
  </div>
  ${
    rlEvents.length > 0
      ? `<div class="section">
    <h2>Rate Limit Events <span style="color:#8b949e;font-weight:400;font-size:0.8rem">(last ${rlEvents.length})</span></h2>
    <table><thead><tr><th>Time</th><th>IP</th><th>Status</th><th style="text-align:right">Count/Max</th></tr></thead><tbody>${rlRows}</tbody></table>
    ${
      topOffenderList.length > 0
        ? `<h3 style="font-size:0.9rem;color:#f0f6fc;margin-top:1rem;margin-bottom:0.5rem">Top Offenders</h3>
    <table><thead><tr><th>IP</th><th style="text-align:right">Total</th><th style="text-align:right">Blocked</th></tr></thead><tbody>${topOffenderRows}</tbody></table>`
        : ''
    }
  </div>`
      : ''
  }
  ${
    cacheStats
      ? `<div class="section"><h2>Cache Stats</h2><table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
    <tr><td>Hits</td><td>${cacheStats.hits}</td></tr>
    <tr><td>Misses</td><td>${cacheStats.misses}</td></tr>
    <tr><td>Keys</td><td>${cacheStats.keys}</td></tr>
    <tr><td>Size</td><td>${cacheStats.size}</td></tr>
  </tbody></table></div>`
      : ''
  }
  <div class="section">
    <h2>Loaded Config</h2>
    ${configRows.length > 0 ? `<table><thead><tr><th>Key</th><th>Value</th></tr></thead><tbody>${configRows}</tbody></table>` : '<p>No configuration loaded.</p>'}
  </div>
  <div class="section">
    <h2>System Information</h2>
    <table><thead><tr><th>Property</th><th>Value</th></tr></thead><tbody>${sysRows}</tbody></table>
  </div>
</div>
</body>
</html>`
}

export { queryBuffer, rateLimitEvents }
