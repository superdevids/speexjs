import { VectorStore, chunkText } from './vector.js'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions based solely on the provided context. If the context does not contain enough information to answer the question, say so clearly. Do not make up information.`

export interface EmbeddingFunction {
  (text: string): Promise<number[]>
}

export interface RAGQueryOptions {
  topK?: number
  systemPrompt?: string
}

export interface RAGQueryResult {
  answer: string
  sources: Array<{ id: string; score: number }>
}

export class RAGPipeline {
  private store: VectorStore
  private embed: EmbeddingFunction
  private llm: ((prompt: string) => Promise<string>) | null = null

  constructor(store: VectorStore, embedFn: EmbeddingFunction, llmFn?: (prompt: string) => Promise<string>) {
    this.store = store
    this.embed = embedFn
    this.llm = llmFn ?? null
  }

  setLLM(llmFn: (prompt: string) => Promise<string>): void {
    this.llm = llmFn
  }

  async addDocument(text: string, metadata?: Record<string, unknown>): Promise<void> {
    const chunks = chunkText(text)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!
      const source = metadata && 'source' in metadata ? String(metadata.source) : 'doc'
      const id = `${source}-${Date.now()}-${i}`
      const vector = await this.embed(chunk)

      this.store.add(id, vector, {
        ...metadata,
        text: chunk,
        chunkIndex: i,
        totalChunks: chunks.length,
      })
    }
  }

  async query(question: string, options?: RAGQueryOptions): Promise<RAGQueryResult> {
    const topK = options?.topK ?? 5
    const queryVector = await this.embed(question)
    const results = this.store.search(queryVector, topK)

    if (results.length === 0) {
      return { answer: 'No relevant context found to answer the question.', sources: [] }
    }

    const context = results.map((r, i) => `[Source ${i + 1}] ${(r.metadata?.text as string) ?? ''}`).join('\n\n')

    const sources = results.map((r) => ({ id: r.id, score: r.score }))

    const systemPrompt = options?.systemPrompt ?? DEFAULT_SYSTEM_PROMPT

    const prompt = `${systemPrompt}

Context:
${context}

Question: ${question}

Answer based on the context above:`

    if (!this.llm) {
      return {
        answer: `[RAG context retrieved — no LLM configured]\n\nRetrieved ${results.length} relevant passages.\n\n${context}`,
        sources,
      }
    }

    const answer = await this.llm(prompt)

    return { answer, sources }
  }
}
