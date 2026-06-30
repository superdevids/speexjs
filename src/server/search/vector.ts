export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must have the same length (got ${a.length} and ${b.length})`)
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    const ai = a[i]!
    const bi = b[i]!
    dotProduct += ai * bi
    normA += ai * ai
    normB += bi * bi
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB)

  if (magnitude === 0) return 0

  return dotProduct / magnitude
}

export function chunkText(text: string, chunkSize = 512, overlap = 64): string[] {
  if (chunkSize <= 0) throw new Error('chunkSize must be positive')
  if (overlap < 0) throw new Error('overlap must be non-negative')
  if (overlap >= chunkSize) throw new Error('overlap must be less than chunkSize')

  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end))
    start += chunkSize - overlap
  }

  return chunks
}

export interface VectorEntry {
  id: string
  vector: number[]
  metadata?: Record<string, unknown>
}

export class VectorStore {
  private entries = new Map<string, VectorEntry>()

  add(id: string, vector: number[], metadata?: Record<string, unknown>): void {
    if (this.entries.has(id)) {
      throw new Error(`Entry with id "${id}" already exists. Use remove() first or pick a unique id.`)
    }
    this.entries.set(id, { id, vector, metadata })
  }

  search(query: number[], topK = 10): Array<{ id: string; score: number; metadata?: Record<string, unknown> }> {
    if (topK <= 0) return []

    const results: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> = []

    for (const entry of this.entries.values()) {
      const score = cosineSimilarity(query, entry.vector)
      results.push({ id: entry.id, score, metadata: entry.metadata })
    }

    results.sort((a, b) => b.score - a.score)

    return results.slice(0, topK)
  }

  remove(id: string): void {
    if (!this.entries.has(id)) {
      throw new Error(`Entry with id "${id}" not found.`)
    }
    this.entries.delete(id)
  }

  clear(): void {
    this.entries.clear()
  }

  get size(): number {
    return this.entries.size
  }
}
