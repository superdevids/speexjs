export interface MemoryEntry {
  value: unknown
  timestamp: number
  ttl?: number
}

export interface SessionMemory {
  data: Map<string, MemoryEntry>
  history: string[]
  createdAt: number
  lastAccessed: number
}

export interface MemorySummary {
  sessionId: string
  summary: string
  createdAt: number
  entryCount: number
}

interface PersistedMemory {
  sessionId: string
  history: string[]
  data: Record<string, { value: unknown; timestamp: number; ttl?: number }>
  persistedAt: number
}

export class AgentMemory {
  private shortTerm: Map<string, SessionMemory> = new Map()
  private memoryDir: string
  private defaultTTL: number
  private cleanupInterval: ReturnType<typeof setInterval> | null = null

  constructor(memoryDir?: string, defaultTTL?: number) {
    this.memoryDir = memoryDir ?? 'resources/agents/memory'
    this.defaultTTL = defaultTTL ?? 30 * 60 * 1000
    this.startCleanup()
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000)
    if (this.cleanupInterval && typeof this.cleanupInterval === 'object') {
      this.cleanupInterval.unref()
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  private ensureSession(sessionId: string): SessionMemory {
    let session = this.shortTerm.get(sessionId)
    if (!session) {
      session = {
        data: new Map(),
        history: [],
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      }
      this.shortTerm.set(sessionId, session)
    }
    session.lastAccessed = Date.now()
    return session
  }

  remember(sessionId: string, key: string, value: unknown, ttl?: number): void {
    const session = this.ensureSession(sessionId)
    session.data.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    })
    const formatted = typeof value === 'string' ? value : JSON.stringify(value)
    session.history.push(`[${key}]: ${formatted}`)
  }

  recall(sessionId: string, key: string): unknown {
    const session = this.ensureSession(sessionId)
    const entry = session.data.get(key)
    if (!entry) return undefined
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      session.data.delete(key)
      return undefined
    }
    return entry.value
  }

  getHistory(sessionId: string): string[] {
    const session = this.ensureSession(sessionId)
    return [...session.history]
  }

  clear(sessionId: string): void {
    this.shortTerm.delete(sessionId)
  }

  cleanup(): void {
    const now = Date.now()
    for (const [sessionId, session] of this.shortTerm) {
      if (now - session.lastAccessed > this.defaultTTL) {
        this.shortTerm.delete(sessionId)
        continue
      }
      for (const [key, entry] of session.data) {
        if (entry.ttl && now - entry.timestamp > entry.ttl) {
          session.data.delete(key)
        }
      }
    }
  }

  private async ensureDir(): Promise<void> {
    const { existsSync, mkdirSync } = await import('node:fs')
    if (!existsSync(this.memoryDir)) {
      mkdirSync(this.memoryDir, { recursive: true })
    }
  }

  async persist(sessionId: string): Promise<void> {
    const session = this.shortTerm.get(sessionId)
    if (!session) return

    await this.ensureDir()

    const filePath = `${this.memoryDir}/${sessionId}.json`
    const data: PersistedMemory = {
      sessionId,
      history: session.history,
      data: Object.fromEntries(session.data),
      persistedAt: Date.now(),
    }
    const fsp = await import('node:fs/promises')
    await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  async load(sessionId: string): Promise<void> {
    const filePath = `${this.memoryDir}/${sessionId}.json`
    try {
      const fsp = await import('node:fs/promises')
      const content = await fsp.readFile(filePath, 'utf-8')
      const data = JSON.parse(content) as PersistedMemory
      const session = this.ensureSession(sessionId)
      session.history.push(...data.history)
      for (const [key, entry] of Object.entries(data.data)) {
        session.data.set(key, {
          value: entry.value,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
        })
      }
    } catch {
      // File does not exist yet
    }
  }

  async generateSummary(sessionId: string): Promise<string> {
    const session = this.shortTerm.get(sessionId)
    if (!session || session.history.length === 0) return ''

    const totalEntries = session.history.length
    const keyCount = session.data.size
    const duration = Date.now() - session.createdAt
    const summary = `Session ${sessionId}: ${totalEntries} interactions, ${keyCount} stored keys, active for ${Math.round(duration / 60000)} minutes`

    await this.ensureDir()

    const summaryFile = `${this.memoryDir}/${sessionId}_summary.json`
    const summaryData: MemorySummary = {
      sessionId,
      summary,
      createdAt: Date.now(),
      entryCount: totalEntries,
    }
    const fsp = await import('node:fs/promises')
    await fsp.writeFile(summaryFile, JSON.stringify(summaryData, null, 2), 'utf-8')

    return summary
  }

  async listSessions(): Promise<string[]> {
    const fsp = await import('node:fs/promises')
    try {
      const files = await fsp.readdir(this.memoryDir)
      const sessions = new Set<string>()
      for (const file of files) {
        if (file.endsWith('.json') && !file.endsWith('_summary.json')) {
          sessions.add(file.replace('.json', ''))
        }
      }
      return Array.from(sessions)
    } catch {
      return []
    }
  }
}
