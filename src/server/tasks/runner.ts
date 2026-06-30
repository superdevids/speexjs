import { execSync } from 'node:child_process'

export class TaskRunner {
  private tasks = new Map<string, string>()

  define(name: string, command: string): void { this.tasks.set(name, command) }

  run(name: string): { output: string; success: boolean } {
    const cmd = this.tasks.get(name)
    if (!cmd) return { output: `Task "${name}" not found`, success: false }
    try {
      const output = execSync(cmd, { encoding: 'utf-8', timeout: 30000 })
      return { output: output.trim(), success: true }
    } catch (e: any) { return { output: e.message, success: false } }
  }

  list(): string[] { return [...this.tasks.keys()] }
}
