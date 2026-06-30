export interface OrchestratorAgent {
  name: string
  run: (input: string) => Promise<string>
}

export interface AgentResult {
  agentName: string
  output: string
  error?: string
}

export interface OrchestratorResult {
  success: boolean
  output: string
  results: AgentResult[]
  totalTime: number
}

export class AgentOrchestrator {
  async sequential(agents: OrchestratorAgent[], input: string): Promise<OrchestratorResult> {
    const start = Date.now()
    let currentInput = input
    const results: AgentResult[] = []

    for (const agent of agents) {
      try {
        const output = await agent.run(currentInput)
        results.push({ agentName: agent.name, output })
        currentInput = output
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        results.push({ agentName: agent.name, output: '', error })
        return {
          success: false,
          output: '',
          results,
          totalTime: Date.now() - start,
        }
      }
    }

    return {
      success: true,
      output: currentInput,
      results,
      totalTime: Date.now() - start,
    }
  }

  async parallel(agents: OrchestratorAgent[], input: string): Promise<OrchestratorResult> {
    const start = Date.now()

    const results = await Promise.all(
      agents.map(a =>
        a.run(input)
          .then(
            (output): AgentResult => ({ agentName: a.name, output }),
            (err: unknown): AgentResult => ({
              agentName: a.name,
              output: '',
              error: err instanceof Error ? err.message : String(err),
            }),
          ),
      ),
    )

    const allSuccess = results.every(r => !r.error)
    const merged = results
      .filter(r => r.output)
      .map(r => r.output)
      .join('\n\n')

    return {
      success: allSuccess,
      output: merged,
      results,
      totalTime: Date.now() - start,
    }
  }

  async supervisor(
    mainAgent: OrchestratorAgent,
    subAgents: OrchestratorAgent[],
    input: string,
  ): Promise<OrchestratorResult> {
    const start = Date.now()
    const results: AgentResult[] = []

    const subResults = await Promise.all(
      subAgents.map(a =>
        a.run(input)
          .then(
            (output): AgentResult => ({ agentName: a.name, output }),
            (err: unknown): AgentResult => ({
              agentName: a.name,
              output: '',
              error: err instanceof Error ? err.message : String(err),
            }),
          ),
      ),
    )

    results.push(...subResults)

    const subContext = subResults
      .filter(r => r.output)
      .map(r => `[${r.agentName}]: ${r.output}`)
      .join('\n')

    const mainInput = subContext
      ? `Context from sub-agents:\n${subContext}\n\nOriginal task: ${input}`
      : input

    try {
      const mainOutput = await mainAgent.run(mainInput)
      results.push({ agentName: mainAgent.name, output: mainOutput })
      return {
        success: true,
        output: mainOutput,
        results,
        totalTime: Date.now() - start,
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ agentName: mainAgent.name, output: '', error })
      return {
        success: false,
        output: '',
        results,
        totalTime: Date.now() - start,
      }
    }
  }
}
