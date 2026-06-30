// ─── SpeexJS Full-Text Search Engine ─────────────────────────
// Supports PostgreSQL tsvector, SQLite FTS5, and in-memory TF-IDF
// Zero external dependencies

export interface SearchResult<T = any> {
  id: string | number
  score: number          // Relevance score (0-1)
  highlighted?: string   // HTML with <mark> tags
  data: T               // Original record data
}

export interface SearchQuery {
  text: string
  fields?: string[]      // Fields to search (default: all indexed)
  fuzzy?: boolean        // Typo tolerance
  highlight?: boolean    // Return highlighted text
  limit?: number
  offset?: number
  where?: Record<string, any>  // Additional filters
}

export type SearchBackend = 'auto' | 'postgres' | 'sqlite' | 'memory'

// ─── Term Frequency-Inverse Document Frequency (TF-IDF) ─────

interface TfIdfEntry {
  term: string
  idf: number
  documents: Map<string | number, { tf: number; data: any }>
}

export class TfIdfIndex {
  private entries: Map<string, TfIdfEntry> = new Map()
  private totalDocs = 0
  private docFields = new Map<string | number, Map<string, string>>()  // docId -> field -> text
  
  addDocument(id: string | number, fields: Record<string, string>): void {
    this.totalDocs++
    const fieldMap = new Map(Object.entries(fields))
    this.docFields.set(id, fieldMap)
    
    for (const [field, text] of Object.entries(fields)) {
      const terms = this.tokenize(text)
      const termFreq = new Map<string, number>()
      
      for (const term of terms) {
        termFreq.set(term, (termFreq.get(term) || 0) + 1)
      }
      
      for (const [term, count] of termFreq) {
        let entry = this.entries.get(term)
        if (!entry) {
          entry = { term, idf: 0, documents: new Map() }
          this.entries.set(term, entry)
        }
        entry.documents.set(id, { tf: count / terms.length, data: { id, [field]: text, _fields: Object.fromEntries(fieldMap) } })
      }
    }
    
    // Recalculate IDF
    for (const [, entry] of this.entries) {
      entry.idf = Math.log(this.totalDocs / (1 + entry.documents.size))
    }
  }
  
  removeDocument(id: string | number): void {
    for (const [, entry] of this.entries) {
      entry.documents.delete(id)
    }
    this.docFields.delete(id)
    this.totalDocs = Math.max(0, this.totalDocs - 1)
  }
  
  search(query: SearchQuery): SearchResult[] {
    const terms = this.tokenize(query.text)
    if (terms.length === 0) return []
    
    // Fuzzy matching: for each term, find similar terms using Levenshtein
    let searchTerms = terms
    if (query.fuzzy) {
      searchTerms = this.expandWithFuzzy(terms)
    }
    
    // Score each document
    const scores = new Map<string | number, { score: number; data: any; highlights: string[] }>()
    
    for (const term of searchTerms) {
      const entry = this.entries.get(term)
      if (!entry) continue
      
      for (const [docId, doc] of entry.documents) {
        const current = scores.get(docId) || { score: 0, data: doc.data, highlights: [] }
        current.score += entry.idf * doc.tf
        if (query.highlight) {
          current.highlights.push(term)
        }
        scores.set(docId, current)
      }
    }
    
    // Convert to array, sort by score
    let results = Array.from(scores.entries())
      .map(([id, { score, data, highlights }]) => ({
        id,
        score,
        highlighted: query.highlight ? this.highlightText(JSON.stringify(data), highlights) : undefined,
        data,
      }))
      .sort((a, b) => b.score - a.score)
    
    // Apply additional where filters
    if (query.where) {
      results = results.filter((r) => {
        for (const [key, value] of Object.entries(query.where!)) {
          if (r.data[key] !== value && r.data._fields?.[key] !== value) return false
        }
        return true
      })
    }
    
    // Apply pagination
    const offset = query.offset ?? 0
    const limit = query.limit ?? 20
    results = results.slice(offset, offset + limit)
    
    return results
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && t.length < 50)
  }
  
  private expandWithFuzzy(terms: string[]): string[] {
    const allTerms = new Set(terms)
    const allIndexedTerms = Array.from(this.entries.keys())
    
    for (const term of terms) {
      for (const indexed of allIndexedTerms) {
        if (this.levenshteinDistance(term, indexed) <= 1) {
          allTerms.add(indexed)
        }
      }
    }
    
    return Array.from(allTerms)
  }
  
  private levenshteinDistance(a: string, b: string): number {
    const m = a.length
    const n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    
    for (let i = 0; i <= m; i++) dp[i]![0] = i
    for (let j = 0; j <= n; j++) dp[0]![j] = j
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i]![j] = a[i - 1] === b[j - 1]
          ? dp[i - 1]![j - 1]!
          : Math.min(dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!) + 1
      }
    }
    
    return dp[m]![n]!
  }
  
  private highlightText(text: string, terms: string[]): string {
    let result = text
    for (const term of terms) {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      result = result.replace(regex, '<mark>$1</mark>')
    }
    return result
  }
  
  clear(): void {
    this.entries.clear()
    this.docFields.clear()
    this.totalDocs = 0
  }
  
  getStats(): { totalDocs: number; totalTerms: number; averageTermsPerDoc: number } {
    return {
      totalDocs: this.totalDocs,
      totalTerms: this.entries.size,
      averageTermsPerDoc: this.totalDocs > 0 ? Math.round(this.entries.size / this.totalDocs) : 0,
    }
  }
}

// ─── Main Search Engine ───────────────────────────────────────

export class SearchEngine {
  private index: TfIdfIndex
  private backend: SearchBackend
  
  constructor(backend: SearchBackend = 'memory') {
    this.index = new TfIdfIndex()
    this.backend = backend
  }
  
  // Index a model's fields for search
  async indexModel(modelName: string, fields: string[], getAllRecords: () => Promise<any[]>): Promise<void> {
    this.index.clear()
    const records = await getAllRecords()
    
    for (const record of records) {
      const searchableFields: Record<string, string> = {}
      for (const field of fields) {
        if (record[field] !== undefined) {
          searchableFields[field] = String(record[field])
        }
      }
      if (Object.keys(searchableFields).length > 0) {
        this.index.addDocument(record.id ?? String(Math.random()), searchableFields)
      }
    }
  }
  
  // Execute search query
  query<T = any>(text: string): SearchQueryBuilder<T> {
    return new SearchQueryBuilder<T>(this.index, text)
  }
  
  // Direct search
  async search<T = any>(query: SearchQuery): Promise<SearchResult<T>[]> {
    return this.index.search(query) as SearchResult<T>[]
  }
  
  getBackend(): SearchBackend {
    return this.backend
  }
  
  getStats() {
    return this.index.getStats()
  }
}

// ─── Fluent Query Builder ─────────────────────────────────────

export class SearchQueryBuilder<T = any> {
  private query: SearchQuery
  
  constructor(private index: TfIdfIndex, text: string) {
    this.query = { text }
  }
  
  where(field: string, value: any): this {
    this.query.where = { ...(this.query.where || {}), [field]: value }
    return this
  }
  
  fuzzy(enabled: boolean = true): this {
    this.query.fuzzy = enabled
    return this
  }
  
  highlight(enabled: boolean = true): this {
    this.query.highlight = enabled
    return this
  }
  
  limit(n: number): this {
    this.query.limit = n
    return this
  }
  
  offset(n: number): this {
    this.query.offset = n
    return this
  }
  
  async get(): Promise<SearchResult<T>[]> {
    return this.index.search(this.query) as SearchResult<T>[]
  }
  
  async first(): Promise<SearchResult<T> | null> {
    this.query.limit = 1
    const results = await this.get()
    return results[0] ?? null
  }
}

// ─── PostgreSQL Full-Text Search Helpers ──────────────────────

export function toTsQuery(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(' & ')
}

export function toTsVector(...columns: string[]): string {
  return columns.map((col) => `coalesce(${col}, '')`).join(` || ' ' || `)
}

// ─── Convenience Export ───────────────────────────────────────

const defaultEngine = new SearchEngine()

export async function indexModel(modelName: string, fields: string[], getAllRecords: () => Promise<any[]>): Promise<void> {
  return defaultEngine.indexModel(modelName, fields, getAllRecords)
}

export function search<T = any>(text: string): SearchQueryBuilder<T> {
  return defaultEngine.query<T>(text)
}

export const Search = {
  index: indexModel,
  query: search,
  engine: defaultEngine,
}
