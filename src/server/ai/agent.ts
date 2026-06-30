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
    throw new Error(`Rate limit exceeded for "${key}". Max ${RATE_LIMIT_MAX} requests per ${RATE_LIMIT_WINDOW / 1000}s.`)
  }

  entry.count++
}

export class AIAgent {
  protected tools: Map<string, AITool> = new Map()
  protected systemPrompt: string
  protected llm: (messages: AgentMessage[]) => Promise<string>
  protected apiKey?: string

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

  private buildToolPrompt(): string {
    if (this.tools.size === 0) return ''

    const toolDescriptions = Array.from(this.tools.values())
      .map(
        (t) =>
          `- ${t.name}: ${t.description} (parameters: ${t.parameters.map((p) => `${p.name}: ${p.type}${p.required ? ' (required)' : ''}`).join(', ')})`,
      )
      .join('\n')

    return `\n\nYou have access to the following tools:\n${toolDescriptions}\n\nTo use a tool, respond with:\n{"tool": "<tool_name>", "args": {<arguments>}}\n\nIf you do not need to use a tool, respond with your answer directly.`
  }

  async run(prompt: string, options?: AgentRunOptions): Promise<string> {
    checkRateLimit(prompt.slice(0, 50))
    const maxIterations = options?.maxIterations ?? 10
    const signal = options?.signal

    const messages: AgentMessage[] = [
      { role: 'system', content: this.systemPrompt + this.buildToolPrompt() },
      { role: 'user', content: prompt },
    ]

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      if (signal?.aborted) throw new Error('Agent run was aborted')

      const response = await this.llm(messages)
      messages.push({ role: 'assistant', content: response })

      const toolCall = this.parseToolCall(response)

      if (!toolCall) {
        return response
      }

      const tool = this.tools.get(toolCall.name)
      if (!tool) {
        messages.push({
          role: 'tool',
          content: `Error: Tool "${toolCall.name}" not found. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
          toolCallId: toolCall.name,
          toolName: toolCall.name,
        })
        continue
      }

      try {
        const result = await tool.execute(toolCall.args)
        messages.push({
          role: 'tool',
          content: result,
          toolCallId: tool.name,
          toolName: tool.name,
        })
      } catch (err) {
        messages.push({
          role: 'tool',
          content: `Error executing tool "${tool.name}": ${err instanceof Error ? err.message : String(err)}`,
          toolCallId: tool.name,
          toolName: tool.name,
        })
      }
    }

    throw new Error(`Agent reached max iterations (${maxIterations}) without producing a final answer.`)
  }

  private parseToolCall(response: string): { name: string; args: Record<string, unknown> } | null {
    const trimmed = response.trim()

    if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) return null

    const jsonStr = trimmed.startsWith('```') ? trimmed.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '') : trimmed

    try {
      const parsed = JSON.parse(jsonStr)
      if (parsed && typeof parsed === 'object' && 'tool' in parsed) {
        return { name: String(parsed.tool), args: (parsed.args as Record<string, unknown>) ?? {} }
      }
    } catch {
      /* not JSON — treat as direct answer */
    }

    return null
  }
}

const searchWebTool: AITool = {
  name: 'searchWeb',
  description: 'Search the web for current information',
  parameters: [{ name: 'query', type: 'string', description: 'The search query', required: true }],
  async execute(args) {
    const query = String(args.query ?? '')
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(url)
    const data = await res.json()
    return JSON.stringify(data)
  },
}

const fetchURLTool: AITool = {
  name: 'fetchURL',
  description: 'Fetch content from a URL',
  parameters: [{ name: 'url', type: 'string', description: 'The URL to fetch', required: true }],
  async execute(args) {
    const url = String(args.url ?? '')
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
  description: 'Execute JavaScript/TypeScript code in a sandboxed environment (uses vm module)',
  parameters: [{ name: 'code', type: 'string', description: 'The code to execute', required: true }],
  async execute(args) {
    const code = String(args.code ?? '')
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
