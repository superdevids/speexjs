import { cosineSimilarity } from '../search/vector.js'
import type { IEmbeddingProvider } from '../ai/embedding.js'

export interface SemanticCacheConfig {
  embedder: IEmbeddingProvider
  threshold?: number
  ttl?: number
  maxEntries?: number
}

interface SemanticCacheEntry<T = unknown> {
  key: string
  value: T
  embedding: number[]
  metadata?: Record<string, unknown>
  expiresAt: number
  lastAccessed: number
}

export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  entryCount: number
  avgSimilarity: number
}

export class SemanticCache {
  private config: Required<SemanticCacheConfig>
  private entries: SemanticCacheEntry[] = []
  private exactMap = new Map<string, SemanticCacheEntry>()
  private hits = 0
  private misses = 0
  private similaritySum = 0
  private similarityCount = 0

  constructor(config: SemanticCacheConfig) {
    this.config = {
      threshold: 0.92,
      ttl: 3600,
      maxEntries: 10000,
      ...config,
    }
  }

  async getOrCompute<T>(
    query: string,
    compute: (query: string) => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const cached = await this.get<T>(query)
    if (cached !== null) return cached

    const value = await compute(query)
    await this.set(query, value, metadata)
    return value
  }

  async get<T>(query: string): Promise<T | null> {
    this.purgeExpired()

    const exact = this.exactMap.get(query)
    if (exact) {
      exact.lastAccessed = Date.now()
      this.hits++
      return exact.value as T
    }

    const queryEmbedding = await this.config.embedder.embed(query)

    let bestMatch: SemanticCacheEntry | null = null
    let bestScore = 0

    for (const entry of this.entries) {
      if (this.isExpired(entry)) continue
      const score = cosineSimilarity(queryEmbedding, entry.embedding)
      if (score > bestScore) {
        bestScore = score
        bestMatch = entry
      }
    }

    if (bestMatch && bestScore >= this.config.threshold) {
      bestMatch.lastAccessed = Date.now()
      this.hits++
      this.similaritySum += bestScore
      this.similarityCount++
      return bestMatch.value as T
    }

    this.misses++
    return null
  }

  async set<T>(
    query: string,
    value: T,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    const existing = this.exactMap.get(query)
    if (existing) {
      existing.value = value
      existing.metadata = metadata
      existing.expiresAt = Date.now() + this.config.ttl * 1000
      existing.lastAccessed = Date.now()
      return
    }

    const embedding = await this.config.embedder.embed(query)

    if (this.entries.length >= this.config.maxEntries) {
      this.evictLRU()
    }

    const entry: SemanticCacheEntry = {
      key: query,
      value,
      embedding,
      metadata,
      expiresAt: Date.now() + this.config.ttl * 1000,
      lastAccessed: Date.now(),
    }

    this.entries.push(entry)
    this.exactMap.set(query, entry)
  }

  async delete(query: string): Promise<boolean> {
    const idx = this.entries.findIndex((e) => e.key === query)
    if (idx === -1) return false
    this.entries.splice(idx, 1)
    this.exactMap.delete(query)
    return true
  }

  async clear(): Promise<void> {
    this.entries = []
    this.exactMap.clear()
    this.hits = 0
    this.misses = 0
    this.similaritySum = 0
    this.similarityCount = 0
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      entryCount: this.entries.length,
      avgSimilarity: this.similarityCount > 0 ? this.similaritySum / this.similarityCount : 0,
    }
  }

  get size(): number {
    return this.entries.length
  }

  private isExpired(entry: SemanticCacheEntry): boolean {
    return entry.expiresAt < Date.now()
  }

  private purgeExpired(): void {
    const now = Date.now()
    this.entries = this.entries.filter((entry) => {
      if (entry.expiresAt < now) {
        this.exactMap.delete(entry.key)
        return false
      }
      return true
    })
  }

  private evictLRU(): void {
    let oldest = this.entries[0]
    let oldestIdx = 0
    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i]!
      if (entry.lastAccessed < oldest!.lastAccessed) {
        oldest = entry
        oldestIdx = i
      }
    }
    this.exactMap.delete(oldest!.key)
    this.entries.splice(oldestIdx, 1)
  }
}
