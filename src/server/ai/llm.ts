export type LLMProviderType = 'openai' | 'anthropic' | 'google' | 'ollama'

export interface LLMOptions {
  provider: LLMProviderType
  model?: string
  apiKey?: string
  baseURL?: string
  maxTokens?: number
  temperature?: number
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
}

export interface LLMTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface StructuredOutputOptions {
  messages: LLMMessage[]
  schema: Record<string, unknown>
  schemaName?: string
  options?: GenerateOptions
}

export interface ToolCallOptions {
  messages: LLMMessage[]
  tools: LLMTool[]
  options?: GenerateOptions
}

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface LLMToolCallResult {
  content: string
  toolCalls: ToolCall[]
  usage: TokenUsage | null
}

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface CumulativeUsage {
  totalTokens: number
  totalCost: number
  requests: number
  promptTokens: number
  completionTokens: number
}

export interface ModelInfo {
  id: string
  provider: LLMProviderType
  name: string
  inputCostPer1M: number
  outputCostPer1M: number
}

export interface ModelConfigItem {
  id: string
  provider: LLMProviderType
  name: string
  inputCost: number
  outputCost: number
}

const MODEL_REGISTRY: ModelConfigItem[] = [
  { id: 'gpt-4o', provider: 'openai', name: 'GPT-4o', inputCost: 2.50, outputCost: 10.00 },
  { id: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini', inputCost: 0.15, outputCost: 0.60 },
  { id: 'gpt-4-turbo', provider: 'openai', name: 'GPT-4 Turbo', inputCost: 10.00, outputCost: 30.00 },
  { id: 'gpt-4', provider: 'openai', name: 'GPT-4', inputCost: 30.00, outputCost: 60.00 },
  { id: 'gpt-3.5-turbo', provider: 'openai', name: 'GPT-3.5 Turbo', inputCost: 0.50, outputCost: 1.50 },
  { id: 'claude-sonnet-4', provider: 'anthropic', name: 'Claude Sonnet 4', inputCost: 3.00, outputCost: 15.00 },
  { id: 'claude-3-5-sonnet', provider: 'anthropic', name: 'Claude 3.5 Sonnet', inputCost: 3.00, outputCost: 15.00 },
  { id: 'claude-3-opus', provider: 'anthropic', name: 'Claude 3 Opus', inputCost: 15.00, outputCost: 75.00 },
  { id: 'claude-3-haiku', provider: 'anthropic', name: 'Claude 3 Haiku', inputCost: 0.25, outputCost: 1.25 },
  { id: 'claude-4-opus', provider: 'anthropic', name: 'Claude 4 Opus', inputCost: 15.00, outputCost: 75.00 },
  { id: 'claude-4-haiku', provider: 'anthropic', name: 'Claude 4 Haiku', inputCost: 0.25, outputCost: 1.25 },
  { id: 'gemini-1.5-pro', provider: 'google', name: 'Gemini 1.5 Pro', inputCost: 1.25, outputCost: 5.00 },
  { id: 'gemini-1.5-flash', provider: 'google', name: 'Gemini 1.5 Flash', inputCost: 0.075, outputCost: 0.30 },
  { id: 'gemini-2.0-flash', provider: 'google', name: 'Gemini 2.0 Flash', inputCost: 0.10, outputCost: 0.40 },
  { id: 'gemma', provider: 'ollama', name: 'Gemma', inputCost: 0, outputCost: 0 },
  { id: 'llama', provider: 'ollama', name: 'Llama', inputCost: 0, outputCost: 0 },
  { id: 'mistral', provider: 'ollama', name: 'Mistral', inputCost: 0, outputCost: 0 },
  { id: 'mixtral', provider: 'ollama', name: 'Mixtral', inputCost: 0, outputCost: 0 },
  { id: 'qwen', provider: 'ollama', name: 'Qwen', inputCost: 0, outputCost: 0 },
  { id: 'phi', provider: 'ollama', name: 'Phi', inputCost: 0, outputCost: 0 },
  { id: 'codellama', provider: 'ollama', name: 'CodeLlama', inputCost: 0, outputCost: 0 },
  { id: 'nomic-embed-text', provider: 'ollama', name: 'Nomic Embed Text', inputCost: 0, outputCost: 0 },
  { id: 'deepseek-coder', provider: 'ollama', name: 'DeepSeek Coder', inputCost: 0, outputCost: 0 },
  { id: 'llava', provider: 'ollama', name: 'LLaVA', inputCost: 0, outputCost: 0 },
  { id: 'gemma2', provider: 'ollama', name: 'Gemma 2', inputCost: 0, outputCost: 0 },
  { id: 'llama3', provider: 'ollama', name: 'Llama 3', inputCost: 0, outputCost: 0 },
  { id: 'llama3.1', provider: 'ollama', name: 'Llama 3.1', inputCost: 0, outputCost: 0 },
  { id: 'llama3.2', provider: 'ollama', name: 'Llama 3.2', inputCost: 0, outputCost: 0 },
  { id: 'llama3.3', provider: 'ollama', name: 'Llama 3.3', inputCost: 0, outputCost: 0 },
  { id: 'qwen2', provider: 'ollama', name: 'Qwen 2', inputCost: 0, outputCost: 0 },
  { id: 'qwen2.5', provider: 'ollama', name: 'Qwen 2.5', inputCost: 0, outputCost: 0 },
  { id: 'deepseek-r1', provider: 'ollama', name: 'DeepSeek R1', inputCost: 0, outputCost: 0 },
]

function findModelConfig(model: string, provider: LLMProviderType): ModelConfigItem | undefined {
  const exact = MODEL_REGISTRY.find(m => m.id === model && m.provider === provider)
  if (exact) return exact
  return MODEL_REGISTRY.find(m => model.startsWith(m.id) && m.provider === provider)
}

function defaultModel(provider: LLMProviderType): string {
  switch (provider) {
    case 'openai': return 'gpt-4o'
    case 'anthropic': return 'claude-sonnet-4'
    case 'google': return 'gemini-1.5-pro'
    case 'ollama': return 'llama3.2'
  }
}

function defaultBaseURL(provider: LLMProviderType): string {
  switch (provider) {
    case 'openai': return 'https://api.openai.com/v1'
    case 'anthropic': return 'https://api.anthropic.com'
    case 'google': return 'https://generativelanguage.googleapis.com'
    case 'ollama': return 'http://localhost:11434'
  }
}

function generateId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: LLMProviderType,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`)
    this.name = 'LLMError'
  }
}

interface ProviderResponse {
  content: string
  usage: TokenUsage | null
  toolCalls?: ToolCall[]
}

type StreamEvent =
  | { type: 'content'; content: string }
  | { type: 'usage'; usage: TokenUsage }
  | { type: 'done' }

interface ILLMProvider {
  readonly model: string
  chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse>
  chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent>
}

abstract class BaseProvider implements ILLMProvider {
  public readonly model: string
  protected readonly apiKey: string | undefined
  public readonly baseURL: string
  public readonly maxTokens: number
  public readonly temperature: number

  constructor(options: LLMOptions) {
    this.model = options.model ?? defaultModel(options.provider)
    this.apiKey = options.apiKey
    this.baseURL = options.baseURL ?? defaultBaseURL(options.provider)
    this.maxTokens = options.maxTokens ?? 4096
    this.temperature = options.temperature ?? 0.7
  }

  abstract chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse>
  abstract chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent>

  protected abstract providerName(): LLMProviderType

  protected splitSystemMessages(messages: LLMMessage[]): { system: string; others: LLMMessage[] } {
    const systemParts: string[] = []
    const others: LLMMessage[] = []
    for (const msg of messages) {
      if (msg.role === 'system') {
        systemParts.push(msg.content)
      } else {
        others.push(msg)
      }
    }
    return { system: systemParts.join('\n'), others }
  }

  protected convertTools(tools: LLMTool[]): unknown[] {
    return tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: t.parameters,
        required: Object.entries(t.parameters as Record<string, { type?: string }>)
          .filter(([_, v]) => v?.type !== 'boolean')
          .map(([k]) => k),
      },
    }))
  }

  protected async apiRequest(
    path: string,
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal },
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
      signal: options?.signal,
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new LLMError(
        `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
        this.providerName(),
        response.status,
      )
    }
    return response
  }

  protected parseUsage(usage: { promptTokens: number; completionTokens: number; totalTokens: number } | null | undefined): TokenUsage | null {
    if (!usage || usage.totalTokens <= 0) return null
    return {
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    }
  }

}

class OpenAIProvider extends BaseProvider {
  providerName(): LLMProviderType {
    return 'openai'
  }

  async chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      max_tokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
    }

    const response = await this.apiRequest('chat/completions', body, { signal: options?.signal })
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }>
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
    }

    const choice = data.choices[0]
    if (!choice) {
      throw new LLMError('No response choices returned', this.providerName())
    }

    const content = choice.message.content ?? ''
    const usage = data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens }
      : null

    const result: ProviderResponse = { content, usage }

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      result.toolCalls = choice.message.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }))
    }

    return result
  }

  async *chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      max_tokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
      stream: true,
    }

    const response = await this.apiRequest('chat/completions', body, { signal: options?.signal })
    const reader = response.body?.getReader()
    if (!reader) {
      throw new LLMError('Response body is not readable', this.providerName())
    }

    const decoder = new TextDecoder()
    const buffer: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer.push(decoder.decode(value, { stream: true }))
        const text = buffer.join('')
        buffer.length = 0

        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') {
              yield { type: 'done' }
              return
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{ delta: { content?: string }; finish_reason?: string }>
                usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
              }

              if (parsed.usage) {
                yield {
                  type: 'usage',
                  usage: {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens,
                  },
                }
              }

              const delta = parsed.choices?.[0]?.delta
              if (delta?.content) {
                yield { type: 'content', content: delta.content }
              }

              if (parsed.choices?.[0]?.finish_reason === 'stop') {
                yield { type: 'done' }
                return
              }
            } catch {
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done' }
  }
}

class AnthropicProvider extends BaseProvider {
  providerName(): LLMProviderType {
    return 'anthropic'
  }

  protected override async apiRequest(
    path: string,
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<Response> {
    const url = `${this.baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey
    }
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new LLMError(
        `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
        this.providerName(),
        response.status,
      )
    }
    return response
  }

  async chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse> {
    const { system, others } = this.splitSystemMessages(messages)

    const body: Record<string, unknown> = {
      model: this.model,
      messages: others.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
    }

    if (system) {
      body['system'] = system
    }

    const response = await this.apiRequest('v1/messages', body, { signal: options?.signal })
    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>
      usage: { input_tokens: number; output_tokens: number }
      stop_reason?: string
    }

    let content = ''
    const toolCalls: ToolCall[] = []

    for (const block of data.content) {
      if (block.type === 'text' && block.text) {
        content += block.text
      } else if (block.type === 'tool_use' && block.name) {
        toolCalls.push({
          id: generateId(),
          name: block.name,
          args: block.input ?? {},
        })
      }
    }

    const usage: TokenUsage | null = data.usage
      ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        }
      : null

    return { content, usage, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
  }

  async *chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent> {
    const { system, others } = this.splitSystemMessages(messages)

    const body: Record<string, unknown> = {
      model: this.model,
      messages: others.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? this.maxTokens,
      temperature: options?.temperature ?? this.temperature,
      stream: true,
    }

    if (system) {
      body['system'] = system
    }

    const response = await this.apiRequest('v1/messages', body, { signal: options?.signal })
    const reader = response.body?.getReader()
    if (!reader) {
      throw new LLMError('Response body is not readable', this.providerName())
    }

    const decoder = new TextDecoder()
    const buffer: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer.push(decoder.decode(value, { stream: true }))
        const text = buffer.join('')
        buffer.length = 0

        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue

          if (line.startsWith('event: ')) {
            continue
          }

          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (!payload) continue

            try {
              const parsed = JSON.parse(payload) as {
                type?: string
                delta?: { text?: string }
                content_block?: { text?: string }
                message?: { usage: { input_tokens: number; output_tokens: number } }
                usage?: { output_tokens: number }
              }

              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield { type: 'content', content: parsed.delta.text }
              } else if (parsed.type === 'content_block_start' && parsed.content_block?.text) {
                yield { type: 'content', content: parsed.content_block.text }
              } else if (parsed.type === 'message_start' && parsed.message?.usage) {
                yield {
                  type: 'usage',
                  usage: {
                    promptTokens: parsed.message.usage.input_tokens,
                    completionTokens: parsed.message.usage.output_tokens,
                    totalTokens: parsed.message.usage.input_tokens + parsed.message.usage.output_tokens,
                  },
                }
              } else if (parsed.type === 'message_delta' && parsed.usage) {
                yield {
                  type: 'usage',
                  usage: {
                    promptTokens: 0,
                    completionTokens: parsed.usage.output_tokens,
                    totalTokens: parsed.usage.output_tokens,
                  },
                }
              } else if (parsed.type === 'message_stop') {
                yield { type: 'done' }
                return
              }
            } catch {
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done' }
  }
}

class GoogleProvider extends BaseProvider {
  providerName(): LLMProviderType {
    return 'google'
  }

  protected override apiRequest(
    path: string,
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<Response> {
    const url = `${this.baseURL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
    const params = this.apiKey ? `?key=${this.apiKey}` : ''
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    return fetch(`${url}${params}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    }).then(async response => {
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.providerName(),
          response.status,
        )
      }
      return response
    })
  }

  public convertMessages(messages: LLMMessage[]): {
    contents: Array<{ role: string; parts: Array<{ text: string }> }>
    systemInstruction?: { parts: Array<{ text: string }> }
  } {
    const { system, others } = this.splitSystemMessages(messages)

    const geminiRole = (role: string): string => {
      if (role === 'assistant') return 'model'
      if (role === 'system') return 'user'
      return role
    }

    const contents = others
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: geminiRole(m.role),
        parts: [{ text: m.content }],
      }))

    const result: {
      contents: Array<{ role: string; parts: Array<{ text: string }> }>
      systemInstruction?: { parts: Array<{ text: string }> }
    } = { contents }

    if (system) {
      result.systemInstruction = { parts: [{ text: system }] }
    }

    return result
  }

  async chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse> {
    const { contents, systemInstruction } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
      },
    }

    if (systemInstruction) {
      body['systemInstruction'] = systemInstruction
    }

    const modelName = this.model.includes('/') ? this.model : `models/${this.model}`
    const response = await this.apiRequest(`${modelName}:generateContent`, body, { signal: options?.signal })
    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> }
        finishReason?: string
      }>
      usageMetadata?: {
        promptTokenCount: number
        candidatesTokenCount: number
        totalTokenCount: number
      }
    }

    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? ''
    const usage = data.usageMetadata
      ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        }
      : null

    return { content: text, usage }
  }

  async *chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent> {
    const { contents, systemInstruction } = this.convertMessages(messages)

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
      },
    }

    if (systemInstruction) {
      body['systemInstruction'] = systemInstruction
    }

    const modelName = this.model.includes('/') ? this.model : `models/${this.model}`
    const response = await this.apiRequest(`${modelName}:streamGenerateContent`, body, { signal: options?.signal })
    const reader = response.body?.getReader()
    if (!reader) {
      throw new LLMError('Response body is not readable', this.providerName())
    }

    const decoder = new TextDecoder()
    const buffer: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer.push(decoder.decode(value, { stream: true }))
        const text = buffer.join('')
        buffer.length = 0

        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (!payload || payload === '[DONE]') {
              yield { type: 'done' }
              return
            }

            try {
              const parsed = JSON.parse(payload) as {
                candidates?: Array<{
                  content?: { parts?: Array<{ text?: string }> }
                  finishReason?: string
                }>
                usageMetadata?: {
                  promptTokenCount: number
                  candidatesTokenCount: number
                  totalTokenCount: number
                }
              }

              if (parsed.usageMetadata) {
                yield {
                  type: 'usage',
                  usage: {
                    promptTokens: parsed.usageMetadata.promptTokenCount,
                    completionTokens: parsed.usageMetadata.candidatesTokenCount,
                    totalTokens: parsed.usageMetadata.totalTokenCount,
                  },
                }
              }

              const parts = parsed.candidates?.[0]?.content?.parts
              if (parts) {
                for (const part of parts) {
                  if (part.text) {
                    yield { type: 'content', content: part.text }
                  }
                }
              }

              if (parsed.candidates?.[0]?.finishReason === 'STOP') {
                yield { type: 'done' }
                return
              }
            } catch {
              continue
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done' }
  }
}

class OllamaProvider extends BaseProvider {
  providerName(): LLMProviderType {
    return 'ollama'
  }

  protected override async apiRequest(
    path: string,
    body: Record<string, unknown>,
    options?: { signal?: AbortSignal },
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
      signal: options?.signal,
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new LLMError(
        `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
        this.providerName(),
        response.status,
      )
    }
    return response
  }

  async chat(messages: LLMMessage[], options?: GenerateOptions): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      options: {
        num_predict: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
      },
      stream: false,
    }

    const response = await this.apiRequest('api/chat', body, { signal: options?.signal })
    const data = (await response.json()) as {
      message?: { content: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> }
      done?: boolean
      prompt_eval_count?: number
      eval_count?: number
    }

    const content = data.message?.content ?? ''
    const usage: TokenUsage | null = (data.prompt_eval_count !== undefined && data.eval_count !== undefined)
      ? {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: data.prompt_eval_count + data.eval_count,
        }
      : null

    const result: ProviderResponse = { content, usage }

    if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
      result.toolCalls = data.message.tool_calls.map(tc => ({
        id: generateId(),
        name: tc.function.name,
        args: tc.function.arguments,
      }))
    }

    return result
  }

  async *chatStream(messages: LLMMessage[], options?: GenerateOptions): AsyncIterable<StreamEvent> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
      })),
      options: {
        num_predict: options?.maxTokens ?? this.maxTokens,
        temperature: options?.temperature ?? this.temperature,
      },
      stream: true,
    }

    const response = await this.apiRequest('api/chat', body, { signal: options?.signal })
    const reader = response.body?.getReader()
    if (!reader) {
      throw new LLMError('Response body is not readable', this.providerName())
    }

    const decoder = new TextDecoder()
    const buffer: string[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer.push(decoder.decode(value, { stream: true }))
        const text = buffer.join('')
        buffer.length = 0

        const lines = text.split('\n')
        for (const line of lines) {
          if (!line.trim()) continue

          try {
            const parsed = JSON.parse(line) as {
              message?: { content: string }
              done?: boolean
              prompt_eval_count?: number
              eval_count?: number
            }

            if (parsed.message?.content) {
              yield { type: 'content', content: parsed.message.content }
            }

            if (parsed.prompt_eval_count !== undefined && parsed.eval_count !== undefined) {
              yield {
                type: 'usage',
                usage: {
                  promptTokens: parsed.prompt_eval_count,
                  completionTokens: parsed.eval_count,
                  totalTokens: parsed.prompt_eval_count + parsed.eval_count,
                },
              }
            }

            if (parsed.done) {
              yield { type: 'done' }
              return
            }
          } catch {
            continue
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    yield { type: 'done' }
  }
}

function splitSystemMessages(messages: LLMMessage[]): { system: string; others: LLMMessage[] } {
  const systemParts: string[] = []
  const others: LLMMessage[] = []
  for (const msg of messages) {
    if (msg.role === 'system') {
      systemParts.push(msg.content)
    } else {
      others.push(msg)
    }
  }
  return { system: systemParts.join('\n'), others }
}

function convertTools(tools: LLMTool[]): unknown[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    parameters: {
      type: 'object',
      properties: t.parameters,
      required: Object.keys(t.parameters as Record<string, unknown>),
    },
  }))
}

function createProvider(options: LLMOptions): ILLMProvider {
  switch (options.provider) {
    case 'openai': return new OpenAIProvider(options)
    case 'anthropic': return new AnthropicProvider(options)
    case 'google': return new GoogleProvider(options)
    case 'ollama': return new OllamaProvider(options)
    default: {
      const _exhaustive: never = options.provider
      throw new LLMError(`Unknown provider "${options.provider}". Supported: openai, anthropic, google, ollama`, 'openai')
    }
  }
}

function calculateCost(model: string, provider: LLMProviderType, usage: TokenUsage): number {
  const config = findModelConfig(model, provider)
  if (!config) return 0

  const inputCost = (usage.promptTokens / 1_000_000) * config.inputCost
  const outputCost = (usage.completionTokens / 1_000_000) * config.outputCost
  return inputCost + outputCost
}

export class LLM {
  private provider: ILLMProvider
  private options: LLMOptions
  private usageHistory: TokenUsage[] = []
  private cumulativeCost: number = 0

  constructor(options: LLMOptions) {
    if (!options.apiKey && options.provider !== 'ollama') {
      throw new LLMError(
        `API key is required for provider "${options.provider}". Use apiKey option or AI_API_KEY env var.`,
        options.provider,
      )
    }
    this.options = {
      ...options,
      model: options.model ?? defaultModel(options.provider),
      baseURL: options.baseURL ?? defaultBaseURL(options.provider),
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens ?? 4096,
    }
    this.provider = createProvider(this.options)
  }

  private recordUsage(usage: TokenUsage | null): void {
    if (!usage || usage.totalTokens <= 0) return
    this.usageHistory.push(usage)
    this.cumulativeCost += calculateCost(this.options.model!, this.options.provider, usage)
  }

  private normalizeMessages(input: string | LLMMessage[]): LLMMessage[] {
    if (typeof input === 'string') {
      return [{ role: 'user', content: input }]
    }
    return input
  }

  getModelInfo(): ModelInfo {
    const config = findModelConfig(this.options.model!, this.options.provider)
    return {
      id: this.options.model!,
      provider: this.options.provider,
      name: config?.name ?? this.options.model!,
      inputCostPer1M: config?.inputCost ?? 0,
      outputCostPer1M: config?.outputCost ?? 0,
    }
  }

  getProvider(): LLMProviderType {
    return this.options.provider
  }

  getModel(): string {
    return this.options.model!
  }

  async generate(input: string | LLMMessage[], options?: GenerateOptions): Promise<string> {
    const messages = this.normalizeMessages(input)
    const result = await this.provider.chat(messages, options)
    this.recordUsage(result.usage)
    return result.content
  }

  async *generateStream(input: string | LLMMessage[], options?: GenerateOptions): AsyncIterable<string> {
    const messages = this.normalizeMessages(input)
    const stream = this.provider.chatStream(messages, options)

    for await (const event of stream) {
      if (event.type === 'content') {
        yield event.content
      } else if (event.type === 'usage') {
        this.recordUsage(event.usage)
      }
    }
  }

  async generateStructured<T = Record<string, unknown>>(
    options: StructuredOutputOptions,
  ): Promise<T> {
    const schemaJSON = JSON.stringify(options.schema, null, 2)

    const schemaPrompt: LLMMessage = {
      role: 'system',
      content: `You must respond with valid JSON that conforms exactly to this schema:\n${schemaJSON}\n\nReturn ONLY valid JSON. Do not include markdown fences, explanations, or anything outside the JSON object.`,
    }

    const messages = [schemaPrompt, ...options.messages]

    if (this.options.provider === 'openai') {
      const body: Record<string, unknown> = {
        model: this.options.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: options.options?.maxTokens ?? this.options.maxTokens,
        temperature: options.options?.temperature ?? this.options.temperature,
        response_format: { type: 'json_object' },
      }

      const url = `${this.options.baseURL!.replace(/\/+$/, '')}/chat/completions`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: options.options?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.options.provider,
          response.status,
        )
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string | null } }>
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      }

      const content = data.choices[0]?.message?.content
      if (!content) {
        throw new LLMError('No content in structured output response', this.options.provider)
      }

      if (data.usage) {
        this.recordUsage({
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        })
      }

      return JSON.parse(content) as T
    }

    if (this.options.provider === 'google') {
      const result = await this.provider.chat(messages, options.options)
      this.recordUsage(result.usage)
      return JSON.parse(result.content) as T
    }

    if (this.options.provider === 'ollama') {
      const body: Record<string, unknown> = {
        model: this.options.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        options: {
          num_predict: options.options?.maxTokens ?? this.options.maxTokens,
          temperature: options.options?.temperature ?? this.options.temperature,
        },
        format: 'json',
        stream: false,
      }

      const url = `${this.options.baseURL}/api/chat`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: options.options?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.options.provider,
          response.status,
        )
      }

      const data = (await response.json()) as {
        message?: { content: string }
        prompt_eval_count?: number
        eval_count?: number
      }

      if (data.prompt_eval_count !== undefined && data.eval_count !== undefined) {
        this.recordUsage({
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: data.prompt_eval_count + data.eval_count,
        })
      }

      return JSON.parse(data.message?.content ?? '{}') as T
    }

    const result = await this.provider.chat(messages, options.options)
    this.recordUsage(result.usage)
    return JSON.parse(result.content) as T
  }

  async withTools(options: ToolCallOptions): Promise<LLMToolCallResult> {
    const { messages, tools, options: genOptions } = options

    if (this.options.provider === 'openai') {
      const body: Record<string, unknown> = {
        model: this.options.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.toolCallId ? { tool_call_id: m.toolCallId } : {}),
        })),
        max_tokens: genOptions?.maxTokens ?? this.options.maxTokens,
        temperature: genOptions?.temperature ?? this.options.temperature,
        tools: tools.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: {
              type: 'object',
              properties: t.parameters,
              required: Object.keys(t.parameters as Record<string, unknown>),
            },
          },
        })),
      }

      const url = `${this.options.baseURL}/chat/completions`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: genOptions?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.options.provider,
          response.status,
        )
      }

      const data = (await response.json()) as {
        choices: Array<{
          message: {
            content: string | null
            tool_calls?: Array<{
              id: string
              function: { name: string; arguments: string }
            }>
          }
        }>
        usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
      }

      const choice = data.choices[0]?.message
      if (!choice) {
        throw new LLMError('No response from tool call', this.options.provider)
      }

      if (data.usage) {
        this.recordUsage({
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        })
      }

      const toolCalls: ToolCall[] = (choice.tool_calls ?? []).map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments) as Record<string, unknown>,
      }))

      return { content: choice.content ?? '', toolCalls, usage: data.usage ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens, totalTokens: data.usage.total_tokens } : null }
    }

    if (this.options.provider === 'anthropic') {
      const { system, others } = splitSystemMessages(messages)

      const body: Record<string, unknown> = {
        model: this.options.model,
        messages: others.map(m => ({ role: m.role, content: m.content })),
        max_tokens: genOptions?.maxTokens ?? this.options.maxTokens,
        temperature: genOptions?.temperature ?? this.options.temperature,
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: {
            type: 'object',
            properties: t.parameters,
            required: Object.keys(t.parameters as Record<string, unknown>),
          },
        })),
      }

      if (system) {
        body['system'] = system
      }

      const url = `${this.options.baseURL}/v1/messages`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.options.apiKey!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(body),
        signal: genOptions?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.options.provider,
          response.status,
        )
      }

      const data = (await response.json()) as {
        content: Array<{ type: string; text?: string; name?: string; input?: Record<string, unknown> }>
        usage: { input_tokens: number; output_tokens: number }
      }

      let content = ''
      const toolCalls: ToolCall[] = []

      for (const block of data.content) {
        if (block.type === 'text' && block.text) {
          content += block.text
        } else if (block.type === 'tool_use' && block.name) {
          toolCalls.push({
            id: generateId(),
            name: block.name,
            args: block.input ?? {},
          })
        }
      }

      const usage: TokenUsage = {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      }

      this.recordUsage(usage)
      return { content, toolCalls, usage }
    }

    if (this.options.provider === 'google') {
      const googleProvider = new GoogleProvider(this.options)
      const { contents, systemInstruction } = googleProvider.convertMessages(messages)

      const body: Record<string, unknown> = {
        contents,
        tools: [{
          functionDeclarations: tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: {
              type: 'object',
              properties: t.parameters,
              required: Object.keys(t.parameters as Record<string, unknown>),
            },
          })),
        }],
        generationConfig: {
          maxOutputTokens: genOptions?.maxTokens ?? this.options.maxTokens,
          temperature: genOptions?.temperature ?? this.options.temperature,
        },
      }

      if (systemInstruction) {
        body['systemInstruction'] = systemInstruction
      }

      const modelName = this.options.model!.includes('/') ? this.options.model : `models/${this.options.model}`
      const url = `${this.options.baseURL}/${modelName}:generateContent?key=${this.options.apiKey}`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: genOptions?.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new LLMError(
          `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
          this.options.provider,
          response.status,
        )
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> } }>
          }
        }>
        usageMetadata?: {
          promptTokenCount: number
          candidatesTokenCount: number
          totalTokenCount: number
        }
      }

      let content = ''
      const toolCalls: ToolCall[] = []

      for (const part of data.candidates?.[0]?.content?.parts ?? []) {
        if (part.text) {
          content += part.text
        }
        if (part.functionCall) {
          toolCalls.push({
            id: generateId(),
            name: part.functionCall.name,
            args: part.functionCall.args,
          })
        }
      }

      const usage: TokenUsage | null = data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : null

      if (usage) this.recordUsage(usage)
      return { content, toolCalls, usage }
    }

    const convertedTools = convertTools(tools)
    const body: Record<string, unknown> = {
      model: this.options.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      options: {
        num_predict: genOptions?.maxTokens ?? this.options.maxTokens,
        temperature: genOptions?.temperature ?? this.options.temperature,
      },
      tools: convertedTools,
      stream: false,
    }

    const url = `${this.options.baseURL}/api/chat`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: genOptions?.signal,
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new LLMError(
        `API request failed: ${response.status} ${response.statusText} — ${errorText}`,
        this.options.provider,
        response.status,
      )
    }

    const data = (await response.json()) as {
      message?: { content: string; tool_calls?: Array<{ function: { name: string; arguments: Record<string, unknown> } }> }
      prompt_eval_count?: number
      eval_count?: number
    }

    const toolCalls: ToolCall[] = (data.message?.tool_calls ?? []).map(tc => ({
      id: generateId(),
      name: tc.function.name,
      args: tc.function.arguments,
    }))

    const usage: TokenUsage | null = (data.prompt_eval_count !== undefined && data.eval_count !== undefined)
      ? {
          promptTokens: data.prompt_eval_count,
          completionTokens: data.eval_count,
          totalTokens: data.prompt_eval_count + data.eval_count,
        }
      : null

    if (usage) this.recordUsage(usage)
    return { content: data.message?.content ?? '', toolCalls, usage }
  }

  getUsage(): CumulativeUsage {
    const totalPromptTokens = this.usageHistory.reduce((sum, u) => sum + u.promptTokens, 0)
    const totalCompletionTokens = this.usageHistory.reduce((sum, u) => sum + u.completionTokens, 0)
    const totalTokens = this.usageHistory.reduce((sum, u) => sum + u.totalTokens, 0)

    return {
      totalTokens,
      totalCost: this.cumulativeCost,
      requests: this.usageHistory.length,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
    }
  }
}
