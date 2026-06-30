import { AgentMemory } from './agent-memory.js'

export interface AIToolParameter {
  name: string
  type: 'string' | 'number' | 'boolean'
  description: string
  required?: boolean
}

export interface AITool {
  name: string
  description: string
  parameters: AIToolParameter[]
  execute(args: Record<string, unknown>): Promise<string>
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolName?: string
}

export interface AgentRunOptions {
  maxIterations?: number
  signal?: AbortSignal
}

export type AgentStatus = 'idle' | 'running' | 'error'

export interface AgentConfig {
  name: string
  instructions: string
  tools?: AITool[]
  llm?: (messages: AgentMessage[]) => Promise<string>
  memory?: AgentMemory
  toolTimeout?: number
}

const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 30
const rateLimitHits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string): void {
  const now = Date.now()
  const entry = rateLimitHits.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitHits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    throw new Error(
      `Rate limit exceeded for "${key}". Max ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s.`,
    )
  }

  entry.count++
}

export class AIAgent {
  protected tools: Map<string, AITool> = new Map()
  protected systemPrompt: string
  protected llm: (messages: AgentMessage[]) => Promise<string>
  protected apiKey?: string
  protected memory?: AgentMemory
  protected memorySessionId?: string
  protected messages: AgentMessage[] = []
  protected status: AgentStatus = 'idle'
  protected toolTimeout: number = 30000

  constructor(systemPrompt: string, llm: (messages: AgentMessage[]) => Promise<string>) {
    this.systemPrompt = systemPrompt
    this.llm = llm
  }

  registerTool(tool: AITool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`)
    }
    this.tools.set(tool.name, tool)
  }

  getTools(): AITool[] {
    return Array.from(this.tools.values())
  }

  setAPIKey(key: string): void {
    this.apiKey = key
  }

  setToolTimeout(ms: number): void {
    this.toolTimeout = ms
  }

  getStatus(): AgentStatus {
    return this.status
  }

  withMemory(sessionId: string, memory?: AgentMemory): this {
    this.memory = memory ?? new AgentMemory()
    this.memorySessionId = sessionId
    return this
  }

  getConversationHistory(): AgentMessage[] {
    return [...this.messages]
  }

  private buildToolPrompt(): string {
    if (this.tools.size === 0) return ''

    const toolDescriptions = Array.from(this.tools.values())
      .map(
        t =>
          `- ${t.name}: ${t.description} (parameters: ${t.parameters.map(p => `${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join(', ')})`,
      )
      .join('\n')

    return `\n\nYou have access to the following tools:\n${toolDescriptions}\n\nTo use a tool, respond with:\n{"tool": "<tool_name>", "args": {<arguments>}}\n\nIf you do not need to use a tool, respond with your answer directly.`
  }

  async run(prompt: string, options?: AgentRunOptions): Promise<string> {
    this.status = 'running'
    checkRateLimit(prompt.slice(0, 50))
    const maxIterations = options?.maxIterations ?? 10
    const signal = options?.signal

    this.messages = [
      { role: 'system', content: this.systemPrompt + this.buildToolPrompt() },
      { role: 'user', content: prompt },
    ]

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (signal?.aborted) throw new Error('Agent run was aborted')

        const response = await this.llm(this.messages)
        this.messages.push({ role: 'assistant', content: response })

        const toolCall = this.parseToolCall(response)

        if (!toolCall) {
          this.status = 'idle'
          if (this.memory && this.memorySessionId) {
            this.memory.remember(this.memorySessionId, 'last_response', response)
          }
          return response
        }

        const tool = this.tools.get(toolCall.name)
        if (!tool) {
          this.messages.push({
            role: 'tool',
            content: `Error: Tool "${toolCall.name}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
            toolCallId: toolCall.name,
            toolName: toolCall.name,
          })
          continue
        }

        try {
          const result = await this.executeWithTimeout(tool, toolCall.args)
          this.messages.push({
            role: 'tool',
            content: result,
            toolCallId: tool.name,
            toolName: tool.name,
          })
          if (this.memory && this.memorySessionId) {
            this.memory.remember(this.memorySessionId, `tool:${tool.name}`, result)
          }
        } catch (err) {
          this.messages.push({
            role: 'tool',
            content: `Error executing tool "${tool.name}": ${err instanceof Error ? err.message : String(err)}`,
            toolCallId: tool.name,
            toolName: tool.name,
          })
        }
      }

      this.status = 'error'
      throw new Error(
        `Agent reached max iterations (${maxIterations}) without producing a final answer.`,
      )
    } catch (err) {
      this.status = 'error'
      throw err
    }
  }

  async *streamRun(prompt: string, options?: AgentRunOptions): AsyncGenerator<string, void, unknown> {
    this.status = 'running'
    checkRateLimit(prompt.slice(0, 50))
    const maxIterations = options?.maxIterations ?? 10
    const signal = options?.signal

    this.messages = [
      { role: 'system', content: this.systemPrompt + this.buildToolPrompt() },
      { role: 'user', content: prompt },
    ]

    try {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (signal?.aborted) throw new Error('Agent run was aborted')

        const response = await this.llm(this.messages)
        this.messages.push({ role: 'assistant', content: response })

        const words = response.split(' ')
        for (let i = 0; i < words.length; i++) {
          yield words[i] + (i < words.length - 1 ? ' ' : '')
        }

        const toolCall = this.parseToolCall(response)

        if (!toolCall) {
          this.status = 'idle'
          if (this.memory && this.memorySessionId) {
            this.memory.remember(this.memorySessionId, 'last_response', response)
          }
          return
        }

        const tool = this.tools.get(toolCall.name)
        if (!tool) {
          this.messages.push({
            role: 'tool',
            content: `Error: Tool "${toolCall.name}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
            toolCallId: toolCall.name,
            toolName: toolCall.name,
          })
          continue
        }

        try {
          const result = await this.executeWithTimeout(tool, toolCall.args)
          this.messages.push({
            role: 'tool',
            content: result,
            toolCallId: tool.name,
            toolName: tool.name,
          })
          if (this.memory && this.memorySessionId) {
            this.memory.remember(this.memorySessionId, `tool:${tool.name}`, result)
          }
        } catch (err) {
          this.messages.push({
            role: 'tool',
            content: `Error executing tool "${tool.name}": ${err instanceof Error ? err.message : String(err)}`,
            toolCallId: tool.name,
            toolName: tool.name,
          })
        }
      }

      this.status = 'error'
      throw new Error(
        `Agent reached max iterations (${maxIterations}) without producing a final answer.`,
      )
    } catch (err) {
      this.status = 'error'
      throw err
    }
  }

  private async executeWithTimeout(tool: AITool, args: Record<string, unknown>): Promise<string> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.toolTimeout)

    try {
      const result = await Promise.race([
        tool.execute(args),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(
              new Error(
                `Tool "${tool.name}" execution timed out after ${this.toolTimeout}ms`,
              ),
            )
          })
        }),
      ])
      return result
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private parseToolCall(response: string): { name: string; args: Record<string, unknown> } | null {
    const trimmed = response.trim()

    if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) return null

    const jsonStr = trimmed.startsWith('```')
      ? trimmed.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
      : trimmed

    try {
      const parsed = JSON.parse(jsonStr) as Record<string, unknown>
      if (parsed && typeof parsed === 'object' && 'tool' in parsed) {
        return {
          name: String(parsed['tool']),
          args: (parsed['args'] as Record<string, unknown>) ?? {},
        }
      }
    } catch {
      /* not JSON — treat as direct answer */
    }

    return null
  }
}

export class Agent extends AIAgent {
  public readonly name: string
  public readonly instructions: string

  constructor(config: AgentConfig) {
    super(
      config.instructions,
      config.llm ?? (async () => { throw new Error('Agent has no LLM function configured. Set llm in AgentConfig or use AIAgent directly.') }),
    )
    this.name = config.name
    this.instructions = config.instructions
    if (config.toolTimeout !== undefined) {
      this.toolTimeout = config.toolTimeout
    }
    if (config.memory) {
      this.agentMemory = config.memory
    }
    if (config.tools) {
      for (const tool of config.tools) {
        this.registerTool(tool)
      }
    }
  }

  private agentMemory: AgentMemory | undefined

  withAgentMemory(memory: AgentMemory, sessionId: string): this {
    this.agentMemory = memory
    this.memorySessionId = sessionId
    return this
  }
}

const searchWebTool: AITool = {
  name: 'searchWeb',
  description: 'Search the web for current information',
  parameters: [
    { name: 'query', type: 'string', description: 'The search query', required: true },
  ],
  async execute(args) {
    const query = String(args['query'] ?? '')
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(url)
    const data = await res.json()
    return JSON.stringify(data)
  },
}

const fetchURLTool: AITool = {
  name: 'fetchURL',
  description: 'Fetch content from a URL',
  parameters: [
    { name: 'url', type: 'string', description: 'The URL to fetch', required: true },
  ],
  async execute(args) {
    const url = String(args['url'] ?? '')
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Only http and https URLs are allowed.')
    }
    const res = await fetch(url)
    const text = await res.text()
    return text.length > 10000 ? text.slice(0, 10000) + '\n... [truncated]' : text
  },
}

const runCodeTool: AITool = {
  name: 'runCode',
  description:
    'Execute JavaScript/TypeScript code in a sandboxed environment (uses vm module)',
  parameters: [
    { name: 'code', type: 'string', description: 'The code to execute', required: true },
  ],
  async execute(args) {
    const code = String(args['code'] ?? '')
    const vm = await import('node:vm')
    const sandbox = {
      console,
      setTimeout,
      clearTimeout,
      Math,
      JSON,
      Date,
      Array,
      Object,
      String,
      Number,
      Boolean,
      RegExp,
      Map,
      Set,
      Promise,
      Error,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
    }

    vm.createContext(sandbox)

    try {
      const result = vm.runInContext(code, sandbox, { timeout: 5000 })
      return String(result)
    } catch (err) {
      return `Error: ${err instanceof Error ? err.message : String(err)}`
    }
  },
}

export const builtInTools = {
  searchWeb: searchWebTool,
  fetchURL: fetchURLTool,
  runCode: runCodeTool,
}
