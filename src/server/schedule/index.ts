export type TaskCallback = () => void | Promise<void>

interface Task {
  name: string
  cron: string
  callback: TaskCallback
  timer?: ReturnType<typeof setInterval>
}

export class Scheduler {
  private tasks: Task[] = []

  private parseCron(cron: string): number {
    const parts = cron.split(/\s+/)
    if (parts.length < 5) throw new Error(`Invalid cron: ${cron}`)
    const minutes = parts[0] === '*' ? 1 : parseInt(parts[0]!)
    const hours = parts[1] === '*' ? 60 : parseInt(parts[1]!) * 60
    return (minutes + (isNaN(hours) ? 0 : hours)) * 60 * 1000
  }

  task(name: string, cron: string, callback: TaskCallback): this {
    const interval = this.parseCron(cron)
    const timer = setInterval(callback, interval)
    if (timer.unref) timer.unref()
    this.tasks.push({ name, cron, callback, timer })
    return this
  }

  remove(name: string): void {
    const idx = this.tasks.findIndex(t => t.name === name)
    if (idx >= 0) {
      const task = this.tasks[idx]!
      clearInterval(task.timer!)
      this.tasks.splice(idx, 1)
    }
  }

  stopAll(): void {
    for (const task of this.tasks) clearInterval(task.timer!)
    this.tasks = []
  }
}
