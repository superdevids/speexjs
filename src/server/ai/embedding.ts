export interface EmbeddingProviderOptions {
  provider: 'openai' | 'anthropic' | 'cohere' | 'ollama'
  model?: string
  apiKey?: string
  baseURL?: string
  maxBatchSize?: number
  fallback?: {
    provider?: 'openai' | 'anthropic' | 'cohere' | 'ollama'
    model?: string
    apiKey?: string
    baseURL?: string
  }
}

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
  getDimension(): number
}

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'EmbeddingError'
  }
}

const KNOWN_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'embed-english-v3.0': 1024,
  'embed-english-light-v3.0': 384,
  'embed-multilingual-v3.0': 1024,
  'embed-multilingual-light-v3.0': 384,
  'nomic-embed-text': 768,
  'all-minilm': 384,
  'mxbai-embed-large': 1024,
  'snowflake-arctic-embed': 768,
  'granite-embedding': 384,
}

abstract class BaseProvider implements IEmbeddingProvider {
  protected readonly model: string
  protected readonly apiKey?: string
  protected readonly baseURL: string
  protected readonly maxBatchSize: number
  protected dimension: number

  constructor(options: EmbeddingProviderOptions, defaultBaseURL: string) {
    this.model = options.model ?? this.defaultModel()
    this.apiKey = options.apiKey
    this.baseURL = options.baseURL ?? defaultBaseURL
    this.maxBatchSize = options.maxBatchSize ?? 100
    this.dimension = KNOWN_DIMENSIONS[this.model] ?? 0
  }

  protected abstract defaultModel(): string
  protected abstract providerName(): string

  abstract embed(text: string): Promise<number[]>
  abstract embedBatch(texts: string[]): Promise<number[][]>

  getDimension(): number {
    if (this.dimension === 0) {
      throw new EmbeddingError(
        `Unknown dimension for model "${this.model}". Call embed() first to detect dimension or specify a known model.`,
        this.providerName(),
      )
    }
    return this.dimension
  }

  protected async apiRequest(
    path: string,
    body: Record<string, unknown>,
  ): Promise<Response> {
    const url = `${this.baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new EmbeddingError(
        `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
        this.providerName(),
      )
    }
    return response
  }

  protected learnDimension(vector: number[]): void {
    if (this.dimension === 0) {
      this.dimension = vector.length
    }
  }

  protected chunkArray<T>(arr: T[], size: number): T[][] {
    if (size <= 0) return [arr]
    const chunks: T[][] = []
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size))
    }
    return chunks
  }
}

class OpenAIProvider extends BaseProvider {
  constructor(options: EmbeddingProviderOptions) {
    super(options, 'https://api.openai.com/v1')
  }

  protected defaultModel(): string {
    return 'text-embedding-3-small'
  }

  protected providerName(): string {
    return 'openai'
  }

  async embed(text: string): Promise<number[]> {
    if (text.length === 0) {
      throw new EmbeddingError('Cannot embed empty text', this.providerName())
    }
    const response = await this.apiRequest('embeddings', {
      model: this.model,
      input: text,
    })
    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>
    }
    const vector = data.data[0]?.embedding
    if (!vector) {
      throw new EmbeddingError('No embedding returned from API', this.providerName())
    }
    this.learnDimension(vector)
    return vector
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const batches = this.chunkArray(texts, this.maxBatchSize)
    const results: number[][] = []
    for (const batch of batches) {
      const response = await this.apiRequest('embeddings', {
        model: this.model,
        input: batch,
      })
      const data = (await response.json()) as {
        data: Array<{ embedding: number[]; index: number }>
      }
      data.data.sort((a, b) => a.index - b.index)
      for (const item of data.data) {
        if (item.embedding) {
          if (results.length === 0) this.learnDimension(item.embedding)
          results.push(item.embedding)
        }
      }
    }
    return results
  }
}

class AnthropicProvider extends BaseProvider {
  constructor(options: EmbeddingProviderOptions) {
    super(options, 'https://api.anthropic.com/v1')
  }

  protected defaultModel(): string {
    return 'claude-3-haiku-20240307'
  }

  protected providerName(): string {
    return 'anthropic'
  }

  async embed(_text: string): Promise<number[]> {
    throw new EmbeddingError(
      'Anthropic does not currently offer a dedicated embedding API. ' +
        'Use OpenAI, Cohere, or Ollama for embeddings.',
      this.providerName(),
    )
  }

  async embedBatch(_texts: string[]): Promise<number[][]> {
    throw new EmbeddingError(
      'Anthropic does not currently offer a dedicated embedding API. ' +
        'Use OpenAI, Cohere, or Ollama for embeddings.',
      this.providerName(),
    )
  }
}

class CohereProvider extends BaseProvider {
  constructor(options: EmbeddingProviderOptions) {
    super(options, 'https://api.cohere.com/v1')
  }

  protected defaultModel(): string {
    return 'embed-english-v3.0'
  }

  protected providerName(): string {
    return 'cohere'
  }

  async embed(text: string): Promise<number[]> {
    if (text.length === 0) {
      throw new EmbeddingError('Cannot embed empty text', this.providerName())
    }
    const response = await this.apiRequest('embed', {
      model: this.model,
      texts: [text],
      input_type: 'search_query',
    })
    const data = (await response.json()) as {
      embeddings: number[][]
    }
    const vector = data.embeddings[0]
    if (!vector) {
      throw new EmbeddingError('No embedding returned from API', this.providerName())
    }
    this.learnDimension(vector)
    return vector
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const response = await this.apiRequest('embed', {
      model: this.model,
      texts,
      input_type: 'search_document',
    })
    const data = (await response.json()) as {
      embeddings: number[][]
    }
    if (data.embeddings.length > 0) {
      this.learnDimension(data.embeddings[0]!)
    }
    return data.embeddings
  }
}

class OllamaProvider extends BaseProvider {
  constructor(options: EmbeddingProviderOptions) {
    super(options, 'http://localhost:11434')
  }

  protected defaultModel(): string {
    return 'nomic-embed-text'
  }

  protected providerName(): string {
    return 'ollama'
  }

  async embed(text: string): Promise<number[]> {
    if (text.length === 0) {
      throw new EmbeddingError('Cannot embed empty text', this.providerName())
    }
    const response = await this.apiRequest('api/embeddings', {
      model: this.model,
      prompt: text,
    })
    const data = (await response.json()) as {
      embedding?: number[]
    }
    if (!data.embedding) {
      throw new EmbeddingError('No embedding returned from API', this.providerName())
    }
    this.learnDimension(data.embedding)
    return data.embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []
    const results: number[][] = []
    for (let i = 0; i < texts.length; i++) {
      const vector = await this.embed(texts[i]!)
      results.push(vector)
    }
    return results
  }
}

class FallbackProvider implements IEmbeddingProvider {
  private primary: IEmbeddingProvider
  private fallback: IEmbeddingProvider
  private primaryName: string
  private fallbackName: string

  constructor(
    primary: IEmbeddingProvider,
    primaryName: string,
    fallback: IEmbeddingProvider,
    fallbackName: string,
  ) {
    this.primary = primary
    this.fallback = fallback
    this.primaryName = primaryName
    this.fallbackName = fallbackName
  }

  async embed(text: string): Promise<number[]> {
    try {
      return await this.primary.embed(text)
    } catch (err) {
      try {
        return await this.fallback.embed(text)
      } catch (fallbackErr) {
        throw new EmbeddingError(
          `Primary provider "${this.primaryName}" failed: ${(err as Error).message}. ` +
            `Fallback provider "${this.fallbackName}" also failed: ${(fallbackErr as Error).message}.`,
          'fallback',
        )
      }
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return await this.primary.embedBatch(texts)
    } catch (err) {
      try {
        return await this.fallback.embedBatch(texts)
      } catch (fallbackErr) {
        throw new EmbeddingError(
          `Primary provider "${this.primaryName}" failed: ${(err as Error).message}. ` +
            `Fallback provider "${this.fallbackName}" also failed: ${(fallbackErr as Error).message}.`,
          'fallback',
        )
      }
    }
  }

  getDimension(): number {
    try {
      return this.primary.getDimension()
    } catch {
      return this.fallback.getDimension()
    }
  }
}

function createProvider(options: EmbeddingProviderOptions): IEmbeddingProvider {
  switch (options.provider) {
    case 'openai':
      return new OpenAIProvider(options)
    case 'anthropic':
      return new AnthropicProvider(options)
    case 'cohere':
      return new CohereProvider(options)
    case 'ollama':
      return new OllamaProvider(options)
    default:
      throw new EmbeddingError(
        `Unknown provider "${options.provider}". Supported: openai, anthropic, cohere, ollama`,
        'config',
      )
  }
}

export class EmbeddingProvider implements IEmbeddingProvider {
  private inner: IEmbeddingProvider
  private options: EmbeddingProviderOptions

  constructor(options: EmbeddingProviderOptions) {
    this.options = options
    const inner = createProvider(options)
    if (options.fallback) {
      const fallback = createProvider({
        provider: options.fallback.provider ?? 'ollama',
        model: options.fallback.model,
        apiKey: options.fallback.apiKey,
        baseURL: options.fallback.baseURL,
      })
      this.inner = new FallbackProvider(
        inner,
        options.provider,
        fallback,
        options.fallback.provider ?? 'ollama',
      )
    } else {
      this.inner = inner
    }
  }

  static create(options: EmbeddingProviderOptions): EmbeddingProvider {
    return new EmbeddingProvider(options)
  }

  embed(text: string): Promise<number[]> {
    return this.inner.embed(text)
  }

  embedBatch(texts: string[]): Promise<number[][]> {
    return this.inner.embedBatch(texts)
  }

  getDimension(): number {
    return this.inner.getDimension()
  }
}
