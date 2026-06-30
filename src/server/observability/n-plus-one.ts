/**
 * SpeexJS Observability — N+1 Query Detection
 * Detects repeated similar SQL queries within a single request.
 */

export interface NPlusOneCandidate {
  pattern: string
  count: number
  examples: string[]
  totalDurationMs: number
  avgDurationMs: number
  firstSeen: number
  lastSeen: number
}

export interface NPlusOneConfig {
  threshold: number
  windowMs: number
}

const DEFAULT_CONFIG: NPlusOneConfig = { threshold: 3, windowMs: 0 }

interface QueryGroup {
  pattern: string
  originalSqls: string[]
  durations: number[]
  firstSeen: number
  lastSeen: number
}

export function normalizeSQL(sql: string): string {
  let normalized = sql.trim()

  // Normalize IN lists
  normalized = normalized.replace(/\bIN\s*\(([^)]+)\)/gi, (_match: string, contents: string) => {
    const items = contents
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean)
    if (items.length <= 2) return `IN (${items.map(() => '?').join(', ')})`
    return 'IN (?, ...)'
  })

  // Replace single-quoted strings
  normalized = normalized.replace(/'(?:[^'\\]|\\.)*'/g, "'?'")
  // Replace numbers
  normalized = normalized.replace(/\b-?\d+(?:\.\d+)?\b/g, '?')
  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, ' ')

  return normalized.trim()
}

export class NPlusOneDetector {
  private groups = new Map<string, QueryGroup>()
  private config: NPlusOneConfig

  constructor(config?: Partial<NPlusOneConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  recordQuery(originalSql: string, normalizedSql?: string, durationMs?: number): void {
    const pattern = normalizedSql ?? normalizeSQL(originalSql)
    const dur = durationMs ?? 0
    const now = Date.now()

    if (this.config.windowMs > 0) this.purgeExpired(now)

    let group = this.groups.get(pattern)
    if (group === undefined) {
      group = { pattern, originalSqls: [], durations: [], firstSeen: now, lastSeen: now }
      this.groups.set(pattern, group)
    }

    group.originalSqls.push(originalSql)
    group.durations.push(dur)
    group.lastSeen = now
  }

  getCandidates(): NPlusOneCandidate[] {
    if (this.config.windowMs > 0) this.purgeExpired(Date.now())

    const candidates: NPlusOneCandidate[] = []
    for (const group of this.groups.values()) {
      if (group.originalSqls.length >= this.config.threshold) {
        const totalDuration = group.durations.reduce((a, b) => a + b, 0)
        candidates.push({
          pattern: group.pattern,
          count: group.originalSqls.length,
          examples: group.originalSqls.slice(0, 5),
          totalDurationMs: totalDuration,
          avgDurationMs: totalDuration / group.originalSqls.length,
          firstSeen: group.firstSeen,
          lastSeen: group.lastSeen,
        })
      }
    }

    candidates.sort((a, b) => b.count - a.count)
    return candidates
  }

  clear(): void {
    this.groups.clear()
  }

  get patternCount(): number {
    return this.groups.size
  }

  get totalQueries(): number {
    let total = 0
    for (const g of this.groups.values()) total += g.originalSqls.length
    return total
  }

  get hasCandidates(): boolean {
    return this.getCandidates().length > 0
  }

  private purgeExpired(now: number): void {
    if (this.config.windowMs <= 0) return
    const cutoff = now - this.config.windowMs
    const keysToDelete: string[] = []
    for (const [key, group] of this.groups) {
      if (group.lastSeen < cutoff) keysToDelete.push(key)
    }
    for (const key of keysToDelete) this.groups.delete(key)
  }
}
