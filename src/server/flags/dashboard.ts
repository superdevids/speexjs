export interface FlagDefinition {
  name: string
  description: string
  enabled: boolean
  rollout?: number
  targets?: Array<{ type: 'user' | 'role' | 'email'; value: string }>
  variants?: Record<string, number>
}

interface FlagAnalytics {
  checks: number
  lastChecked: number
  enabledCount: number
  disabledCount: number
  variantAssignments: Record<string, number>
}

interface InternalFlag extends FlagDefinition {
  analytics: FlagAnalytics
}

function hashUserId(id: string): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export class FlagManager {
  private static _instance: FlagManager
  private flags = new Map<string, InternalFlag>()

  static get instance(): FlagManager {
    if (!FlagManager._instance) {
      FlagManager._instance = new FlagManager()
    }
    return FlagManager._instance
  }

  define(flag: FlagDefinition): void {
    const existing = this.flags.get(flag.name)
    this.flags.set(flag.name, {
      ...flag,
      analytics: existing?.analytics ?? {
        checks: 0,
        lastChecked: 0,
        enabledCount: 0,
        disabledCount: 0,
        variantAssignments: {},
      },
    })
  }

  isEnabled(name: string, context?: { userId?: string; role?: string }): boolean {
    const flag = this.flags.get(name)
    if (!flag) return false

    flag.analytics.checks++
    flag.analytics.lastChecked = Date.now()

    if (!flag.enabled) {
      flag.analytics.disabledCount++
      return false
    }

    if (flag.targets && flag.targets.length > 0 && context) {
      const matched = flag.targets.some((t) => {
        if (t.type === 'user' && t.value === context.userId) return true
        if (t.type === 'role' && t.value === context.role) return true
        if (t.type === 'email' && t.value === context.userId) return true
        return false
      })
      if (matched) {
        flag.analytics.enabledCount++
        return true
      }
      if (flag.rollout === undefined) {
        flag.analytics.disabledCount++
        return false
      }
    }

    if (flag.rollout !== undefined && flag.rollout < 100 && context?.userId) {
      const h = hashUserId(context.userId) % 100
      if (h >= flag.rollout) {
        flag.analytics.disabledCount++
        return false
      }
    }

    flag.analytics.enabledCount++
    return true
  }

  getVariant(name: string, context?: { userId?: string }): string | null {
    const flag = this.flags.get(name)
    if (!flag || !flag.variants || Object.keys(flag.variants).length === 0) return null
    if (!context?.userId) return null

    const entries = Object.entries(flag.variants)
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0)
    if (totalWeight <= 0) return null

    const h = hashUserId(context.userId) % totalWeight
    let cumulative = 0
    for (const [variant, weight] of entries) {
      cumulative += weight
      if (h < cumulative) {
        flag.analytics.variantAssignments[variant] = (flag.analytics.variantAssignments[variant] ?? 0) + 1
        return variant
      }
    }
    const fallback = entries[0]?.[0] ?? null
    if (fallback) {
      flag.analytics.variantAssignments[fallback] = (flag.analytics.variantAssignments[fallback] ?? 0) + 1
    }
    return fallback
  }

  list(): FlagDefinition[] {
    return [...this.flags.values()].map(({ analytics: _, ...rest }) => rest)
  }

  listWithAnalytics(): InternalFlag[] {
    return [...this.flags.values()]
  }

  update(name: string, updates: Partial<FlagDefinition>): void {
    const existing = this.flags.get(name)
    if (!existing) throw new Error(`Flag "${name}" not found`)
    if (updates.name !== undefined && updates.name !== name) {
      this.flags.delete(name)
    }
    this.flags.set(updates.name ?? name, { ...existing, ...updates })
  }

  track(name: string, _context?: Record<string, unknown>): void {
    const flag = this.flags.get(name)
    if (!flag) return
    flag.analytics.checks++
    flag.analytics.lastChecked = Date.now()
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function generateFlagsDashboardHtml(): string {
  const flags = FlagManager.instance.listWithAnalytics()

  const flagCards = flags
    .map((f) => {
      const targetsHtml =
        f.targets && f.targets.length > 0
          ? f.targets.map((t) => `<span class="badge">${t.type}: ${escapeHtml(t.value)}</span>`).join(' ')
          : '<span class="muted">None</span>'

      const variantsHtml =
        f.variants && Object.keys(f.variants).length > 0
          ? Object.entries(f.variants)
              .map(([v, w]) => {
                const assigned = f.analytics.variantAssignments[v] ?? 0
                return `<span class="badge variant">${escapeHtml(v)}: ${w}% (${assigned} assigns)</span>`
              })
              .join(' ')
          : '<span class="muted">None</span>'

      const enabledClass = f.enabled ? 'toggle-on' : 'toggle-off'
      const rolloutVal = f.rollout ?? 100

      return `<div class="flag-card">
  <div class="flag-header">
    <div class="flag-name">
      <strong>${escapeHtml(f.name)}</strong>
      <span class="flag-desc">${escapeHtml(f.description) || '<span class="muted">No description</span>'}</span>
    </div>
    <label class="toggle ${enabledClass}">
      <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="toggleFlag('${escapeHtml(f.name)}', this.checked)" />
      <span class="slider"></span>
    </label>
  </div>
  <div class="flag-body">
    <div class="field">
      <span class="field-label">Rollout</span>
      <div class="rollout-row">
        <input type="range" min="0" max="100" value="${rolloutVal}" oninput="updateRollout('${escapeHtml(f.name)}', this.value)" />
        <span class="rollout-val" id="rollout-${escapeHtml(f.name)}">${rolloutVal}%</span>
      </div>
    </div>
    <div class="field">
      <span class="field-label">Targets</span>
      <div class="badge-row">${targetsHtml}</div>
    </div>
    <div class="field">
      <span class="field-label">A/B Variants</span>
      <div class="badge-row">${variantsHtml}</div>
    </div>
    <div class="field">
      <span class="field-label">Analytics</span>
      <div class="analytics-row">
        <span>Checks: <strong>${f.analytics.checks}</strong></span>
        <span>Enabled: <strong style="color:#3fb950">${f.analytics.enabledCount}</strong></span>
        <span>Disabled: <strong style="color:#f85149">${f.analytics.disabledCount}</strong></span>
        <span>Last: ${f.analytics.lastChecked ? new Date(f.analytics.lastChecked).toLocaleTimeString() : 'Never'}</span>
      </div>
    </div>
  </div>
</div>`
    })
    .join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Feature Flags – SpeexJS</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0d1117;color:#c9d1d9;padding:2rem}
  .wrap{max-width:960px;margin:0 auto}
  h1{font-size:1.75rem;color:#f0f6fc;margin-bottom:0.25rem}
  .subtitle{color:#8b949e;font-size:0.875rem;margin-bottom:2rem}
  .flag-card{background:#161b22;border:1px solid #30363d;border-radius:8px;margin-bottom:1rem;overflow:hidden}
  .flag-header{display:flex;justify-content:space-between;align-items:flex-start;padding:1rem 1.25rem;border-bottom:1px solid #21262d}
  .flag-name strong{font-size:1rem;color:#f0f6fc;display:block;margin-bottom:0.2rem}
  .flag-desc{font-size:0.8rem;color:#8b949e}
  .flag-body{padding:0.75rem 1.25rem 1rem}
  .field{margin-bottom:0.6rem;display:flex;align-items:flex-start;gap:0.75rem}
  .field-label{font-size:0.75rem;color:#8b949e;text-transform:uppercase;letter-spacing:0.05em;min-width:80px;padding-top:2px;flex-shrink:0}
  .rollout-row{display:flex;align-items:center;gap:0.75rem}
  .rollout-row input[type=range]{width:180px;accent-color:#58a6ff}
  .rollout-val{font-size:0.85rem;font-family:'JetBrains Mono',monospace;color:#79c0ff;min-width:45px}
  .badge-row{display:flex;flex-wrap:wrap;gap:0.4rem}
  .badge{display:inline-block;padding:0.15rem 0.5rem;border-radius:4px;font-size:0.75rem;background:#1f6feb22;color:#58a6ff;border:1px solid #1f6feb44}
  .badge.variant{background:#23863622;color:#3fb950;border-color:#23863644}
  .analytics-row{display:flex;flex-wrap:wrap;gap:0.75rem;font-size:0.8rem;color:#8b949e}
  .toggle{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0}
  .toggle input{opacity:0;width:0;height:0}
  .slider{position:absolute;cursor:pointer;inset:0;background-color:#30363d;border-radius:24px;transition:0.3s}
  .slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;bottom:3px;background-color:#8b949e;border-radius:50%;transition:0.3s}
  .toggle-on .slider{background-color:#238636}
  .toggle-on .slider::before{background-color:#fff;transform:translateX(20px)}
  .muted{color:#8b949e;font-style:italic;font-size:0.8rem}
</style>
</head>
<body>
<div class="wrap">
  <h1>Feature Flags</h1>
  <p class="subtitle">Manage feature flags, rollouts, targeting, and A/B tests</p>
  ${flagCards.length > 0 ? flagCards : '<p style="color:#8b949e">No flags defined. Use <code>speexjs make:flag &lt;name&gt;</code> or FlagManager.define() to create flags.</p>'}
</div>
<script>
function toggleFlag(name, enabled) {
  fetch('/_speexjs/flags/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, enabled })
  })
}
function updateRollout(name, value) {
  document.getElementById('rollout-' + name.replace(/[^a-zA-Z0-9]/g, '_')).textContent = value + '%'
  fetch('/_speexjs/flags/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, rollout: parseInt(value) })
  })
}
</script>
</body>
</html>`
}
