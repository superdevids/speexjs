import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'

function toPascalCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toUpperCase())
}

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function toCamelCase(str: string): string {
  return str.replace(/[-_\s]+(.)?/g, (_, c: string) => (c ?? '').toUpperCase()).replace(/^(.)/, (c: string) => c.toLowerCase())
}

export async function makeAgent(name: string): Promise<void> {
  const className = toPascalCase(name)
  const fileName = `${toKebabCase(name)}.agent.ts`
  const targetDir = resolve(process.cwd(), 'src/server/agents')
  const fullPath = resolve(targetDir, fileName)
  const varName = toCamelCase(name)

  if (existsSync(fullPath)) {
    console.error(colors.red(`Agent file ${fileName} already exists!`))
    process.exit(1)
  }

  mkdirSync(targetDir, { recursive: true })

  const content = `import { AIAgent, builtInTools } from 'speexjs/server/ai'
import type { AgentMessage } from 'speexjs/server/ai'

const SYSTEM_PROMPT = \`You are ${className}, an AI agent built with SpeexJS.
You help users by leveraging your tools and knowledge to complete tasks.

Follow these rules:
1. Think step by step before using tools
2. Use tools when you need external information
3. Be concise and accurate in your responses
4. If you cannot complete a task, explain why clearly\`

export class ${className} extends AIAgent {
  constructor() {
    super(SYSTEM_PROMPT, ${className}.defaultLLM)
    this.registerTool(builtInTools.searchWeb)
    this.registerTool(builtInTools.fetchURL)
  }

  static async defaultLLM(messages: AgentMessage[]): Promise<string> {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role === 'user') {
      return JSON.stringify({ tool: 'searchWeb', args: { query: lastMessage.content } })
    }
    return lastMessage.content
  }
}

export const ${varName}Agent = ${className}
`

  writeFileSync(fullPath, content, 'utf-8')

  const routeContent = `import { Router } from 'speexjs/server/router'
import { throttle } from 'speexjs/server/middleware'

export function register${className}Routes(router: Router) {
  router.post('/api/ai/agent/run', throttle(30, 60), async (ctx) => {
    try {
      const { prompt } = await ctx.request.body() as { prompt?: string }
      if (!prompt) {
        return ctx.response.status(400).json({ error: 'prompt is required' })
      }

      const agent = new ${className}()
      const result = await agent.run(prompt)

      return ctx.response.json({ result })
    } catch (err) {
      return ctx.response.status(500).json({
        error: err instanceof Error ? err.message : String(err),
      })
    }
  })
}
`

  const routeFileName = `${toKebabCase(name)}.routes.ts`
  const routePath = resolve(targetDir, routeFileName)
  writeFileSync(routePath, routeContent, 'utf-8')

  console.log(`${colors.green('✅')} Agent ${colors.bold(className)} created at ${colors.cyan(fileName)}`)
  console.log(`${colors.green('✅')} Routes created at ${colors.cyan(routeFileName)}`)
  console.log()
  console.log(`  ${colors.bold('Next steps:')}`)
  console.log(`  ${colors.cyan('1.')} Import and register the agent routes in your app:`)
  console.log(`     ${colors.dim(`import { register${className}Routes } from './src/server/agents/${routeFileName.replace('.ts', '')}'`)}`)
  console.log(`     ${colors.dim(`register${className}Routes(app.router)`)}`)
  console.log(`  ${colors.cyan('2.')} Implement your own LLM function or connect to OpenAI:`)
  console.log(`     ${colors.dim('static async defaultLLM(messages) { return await callOpenAI(messages) }')}`)
  console.log()
}
