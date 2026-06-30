// ─── Full Cron Expression Parser ───────────────────────────────

export interface CronExpression {
  minute: number[]
  hour: number[]
  dayOfMonth: number[]
  month: number[]
  dayOfWeek: number[]
}

export function parseCron(expression: string): CronExpression {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(`Invalid cron expression: "${expression}". Expected 5 fields (minute hour dom month dow)`)
  }

  return {
    minute: parseCronField(parts[0]!, 0, 59),
    hour: parseCronField(parts[1]!, 0, 23),
    dayOfMonth: parseCronField(parts[2]!, 1, 31),
    month: parseCronField(parts[3]!, 1, 12),
    dayOfWeek: parseCronField(parts[4]!, 0, 6),
  }
}

function parseCronField(field: string, min: number, max: number): number[] {
  // Handle comma-separated values
  if (field.includes(',')) {
    return field.split(',').flatMap((f) => parseCronField(f.trim(), min, max))
  }

  // Handle step values: */5, 1-30/5
  if (field.includes('/')) {
    const [range, stepStr] = field.split('/')
    const step = parseInt(stepStr!, 10)
    let rangeStart: number, rangeEnd: number
    if (range === '*') {
      rangeStart = min
      rangeEnd = max
    } else if (range!.includes('-')) {
      const parts = range!.split('-').map(Number)
      rangeStart = parts[0]!
      rangeEnd = parts[1]!
    } else {
      rangeStart = Number(range)
      rangeEnd = Number(range)
    }
    
    const values: number[] = []
    for (let i = rangeStart; i <= rangeEnd; i += step) {
      values.push(i)
    }
    return values
  }

  // Handle wildcard
  if (field === '*') {
    const values: number[] = []
    for (let i = min; i <= max; i++) values.push(i)
    return values
  }

  // Handle range: 1-5
  if (field.includes('-')) {
    const rangeParts = field.split('-').map(Number)
    const start = rangeParts[0]!
    const end = rangeParts[1]!
    const values: number[] = []
    for (let i = start; i <= end; i++) values.push(i)
    return values
  }

  // Single value
  const value = parseInt(field, 10)
  return isNaN(value) ? [] : [value]
}

export function cronMatches(expression: CronExpression, date: Date = new Date()): boolean {
  const minute = date.getMinutes()
  const hour = date.getHours()
  const dayOfMonth = date.getDate()
  const month = date.getMonth() + 1
  const dayOfWeek = date.getDay()

  return (
    expression.minute.includes(minute) &&
    expression.hour.includes(hour) &&
    expression.dayOfMonth.includes(dayOfMonth) &&
    expression.month.includes(month) &&
    expression.dayOfWeek.includes(dayOfWeek)
  )
}

export function getNextRun(expression: CronExpression, from: Date = new Date()): Date {
  // Check next 365 days
  for (let i = 0; i < 525600; i++) {
    const candidate = new Date(from.getTime() + i * 60000)
    if (cronMatches(expression, candidate)) {
      return candidate
    }
  }
  throw new Error('No valid cron date found within 365 days')
}

// ─── Scheduler ─────────────────────────────────────────────────

export interface ScheduledTask {
  name: string
  cron: CronExpression
  expression: string
  task: () => Promise<void>
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
}

export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map()
  private timer: ReturnType<typeof setInterval> | null = null

  constructor() {
    this.timer = setInterval(() => this.tick(), 30000) // Check every 30s
    if (this.timer.unref) this.timer.unref()
  }

  cron(expression: string, nameOrTask: string | (() => Promise<void>), task?: () => Promise<void>): this {
    let taskName: string
    let taskFn: () => Promise<void>

    if (typeof nameOrTask === 'function') {
      taskName = `task-${this.tasks.size + 1}`
      taskFn = nameOrTask
    } else {
      taskName = nameOrTask
      taskFn = task!
    }

    try {
      const parsed = parseCron(expression)
      const nextRun = getNextRun(parsed)

      this.tasks.set(taskName, {
        name: taskName,
        cron: parsed,
        expression,
        task: taskFn,
        enabled: true,
        nextRun,
        runCount: 0,
      })
    } catch (err) {
      console.error(`[Scheduler] Invalid cron expression "${expression}" for task "${taskName}":`, err)
    }

    return this
  }

  private tick(): void {
    const now = new Date()
    for (const [, task] of this.tasks) {
      if (!task.enabled) continue
      if (task.nextRun && now >= task.nextRun) {
        task.runCount++
        task.lastRun = now
        task.nextRun = getNextRun(task.cron, now)
        task.task().catch((err) => {
          console.error(`[Scheduler] Task "${task.name}" failed:`, err)
        })
      }
    }
  }

  pause(name: string): boolean {
    const task = this.tasks.get(name)
    if (!task) return false
    task.enabled = false
    return true
  }

  resume(name: string): boolean {
    const task = this.tasks.get(name)
    if (!task) return false
    task.enabled = true
    task.nextRun = getNextRun(task.cron)
    return true
  }

  remove(name: string): boolean {
    return this.tasks.delete(name)
  }

  list(): ScheduledTask[] {
    return Array.from(this.tasks.values())
  }

  getTask(name: string): ScheduledTask | undefined {
    return this.tasks.get(name)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.tasks.clear()
  }
}
