/**
 * SpeexJS Observability — Metrics Store
 * Zero-dependency Prometheus-format metrics store with counters,
 * histograms (with p50/p95/p99 latency), and gauges.
 */

export type MetricLabels = Record<string, string>

const DEFAULT_BUCKETS_MS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]

export class Counter {
  readonly help: string
  readonly labelValues: MetricLabels
  private _value = 0

  constructor(help: string, labelValues?: MetricLabels) {
    this.help = help
    this.labelValues = { ...labelValues }
  }

  inc(val = 1): void {
    this._value += val
  }
  reset(): void {
    this._value = 0
  }
  get(): number {
    return this._value
  }

  serialize(name: string): string {
    return `${name}${formatLabels(this.labelValues)} ${this._value}`
  }
}

export class Gauge {
  readonly help: string
  readonly labelValues: MetricLabels
  private _value = 0

  constructor(help: string, labelValues?: MetricLabels) {
    this.help = help
    this.labelValues = { ...labelValues }
  }

  set(val: number): void {
    this._value = val
  }
  inc(val = 1): void {
    this._value += val
  }
  dec(val = 1): void {
    this._value -= val
  }
  get(): number {
    return this._value
  }

  serialize(name: string): string {
    return `${name}${formatLabels(this.labelValues)} ${this._value}`
  }
}

export class Histogram {
  readonly help: string
  readonly labelValues: MetricLabels
  readonly buckets: number[]
  private observations: number[] = []
  private _sum = 0

  constructor(help: string, labelValues?: MetricLabels, buckets?: number[]) {
    this.help = help
    this.labelValues = { ...labelValues }
    this.buckets = buckets ?? DEFAULT_BUCKETS_MS
  }

  observe(value: number): void {
    this.observations.push(value)
    this._sum += value
  }

  reset(): void {
    this.observations = []
    this._sum = 0
  }

  get count(): number {
    return this.observations.length
  }
  get sum(): number {
    return this._sum
  }

  percentile(p: number): number {
    if (this.observations.length === 0) return 0
    const sorted = [...this.observations].sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    const clampedIndex = Math.max(0, Math.min(index, sorted.length - 1))
    return sorted[clampedIndex] ?? 0
  }

  p50(): number {
    return this.percentile(50)
  }
  p95(): number {
    return this.percentile(95)
  }
  p99(): number {
    return this.percentile(99)
  }

  serialize(name: string, extraLabels?: MetricLabels): string {
    const lines: string[] = []
    const sorted = [...this.observations].sort((a, b) => a - b)
    let cumCount = 0

    for (const threshold of this.buckets) {
      while (cumCount < sorted.length && (sorted[cumCount] ?? Infinity) <= threshold) cumCount++
      const bl = { ...extraLabels, le: String(threshold / 1000) }
      lines.push(`${name}_bucket${formatLabels(this.labelValues, bl)} ${cumCount}`)
    }

    const infLabels = { ...extraLabels, le: '+Inf' }
    lines.push(`${name}_bucket${formatLabels(this.labelValues, infLabels)} ${sorted.length}`)

    const baseLabels = formatLabels(this.labelValues, extraLabels)
    lines.push(`${name}_sum${baseLabels} ${(this._sum / 1000).toFixed(6)}`)
    lines.push(`${name}_count${baseLabels} ${sorted.length}`)

    return lines.join('\n')
  }
}

function formatLabels(labels: MetricLabels | undefined, extra?: MetricLabels): string {
  const merged = { ...labels, ...extra }
  const entries = Object.entries(merged)
  if (entries.length === 0) return ''
  return '{' + entries.map(([k, v]) => `${k}="${escapeLabelValue(String(v))}"`).join(',') + '}'
}

function escapeLabelValue(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

export class MetricsStore {
  private counters = new Map<string, Counter>()
  private histograms = new Map<string, Histogram>()
  private gauges = new Map<string, Gauge>()

  counter(name: string, help: string, labels?: MetricLabels): Counter {
    let existing = this.counters.get(name)
    if (existing === undefined) {
      existing = new Counter(help, labels)
      this.counters.set(name, existing)
    }
    return existing
  }

  histogram(name: string, help: string, labels?: MetricLabels, buckets?: number[]): Histogram {
    let existing = this.histograms.get(name)
    if (existing === undefined) {
      existing = new Histogram(help, labels, buckets)
      this.histograms.set(name, existing)
    }
    return existing
  }

  gauge(name: string, help: string, labels?: MetricLabels): Gauge {
    let existing = this.gauges.get(name)
    if (existing === undefined) {
      existing = new Gauge(help, labels)
      this.gauges.set(name, existing)
    }
    return existing
  }

  getCounter(name: string): Counter | undefined {
    return this.counters.get(name)
  }
  getHistogram(name: string): Histogram | undefined {
    return this.histograms.get(name)
  }
  getGauge(name: string): Gauge | undefined {
    return this.gauges.get(name)
  }

  prometheusFormatted(): string {
    const lines: string[] = []

    const emitMetric = (name: string, metric: Counter | Gauge | Histogram, type: string) => {
      lines.push(`# HELP ${name} ${metric.help}`)
      lines.push(`# TYPE ${name} ${type}`)
      lines.push(metric.serialize(name))
    }

    const sortedCounters = Array.from(this.counters.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const entry of sortedCounters) {
      const [name, metric] = entry
      emitMetric(name, metric, 'counter')
    }
    const sortedGauges = Array.from(this.gauges.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const entry of sortedGauges) {
      const [name, metric] = entry
      emitMetric(name, metric, 'gauge')
    }
    const sortedHistograms = Array.from(this.histograms.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    for (const entry of sortedHistograms) {
      const [name, metric] = entry
      lines.push(`# HELP ${name} ${metric.help}`)
      lines.push(`# TYPE ${name} histogram`)
      lines.push(metric.serialize(name))
    }

    return lines.join('\n') + '\n'
  }

  resetAll(): void {
    for (const c of this.counters.values()) c.reset()
    for (const h of this.histograms.values()) h.reset()
    for (const g of this.gauges.values()) g.set(0)
  }

  get size(): number {
    return this.counters.size + this.histograms.size + this.gauges.size
  }
}
