import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'

const mockExistsSync = vi.fn()
const mockReadFileSync = vi.fn()
const mockWriteFileSync = vi.fn()
const mockMkdirSync = vi.fn()
const mockReaddirSync = vi.fn()
const mockExit = vi.fn()

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: mockExistsSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  mkdirSync: mockMkdirSync,
  readdirSync: mockReaddirSync,
}))

vi.mock('../src/native/colors.js', () => ({
  colors: {
    red: vi.fn((s: string) => s),
    green: vi.fn((s: string) => s),
    yellow: vi.fn((s: string) => s),
    cyan: vi.fn((s: string) => s),
    bold: vi.fn((s: string) => s),
    dim: vi.fn((s: string) => s),
  },
}))

function setupCLITest() {
  vi.clearAllMocks()
  mockExit.mockImplementation(() => {
    throw new Error('EXIT')
  })
  process.exit = mockExit as any
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
}

describe('env:generate', () => {
  beforeEach(() => {
    setupCLITest()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exits when no .env file found', async () => {
    mockExistsSync.mockReturnValue(false)
    const { envGenerate } = await import('../src/cli/commands/env-generate.js')
    await expect(envGenerate()).rejects.toThrow('EXIT')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('generates src/env.ts from .env file', async () => {
    mockExistsSync.mockImplementation((p: string) => p.includes('.env'))
    mockReadFileSync.mockReturnValue('PORT=3000\nNODE_ENV=development\n')
    let writtenContent = ''
    mockWriteFileSync.mockImplementation((_p: string, c: string) => {
      writtenContent = c
    })

    const { envGenerate } = await import('../src/cli/commands/env-generate.js')
    await envGenerate()

    expect(writtenContent).toContain('AUTO-GENERATED')
    expect(writtenContent).toContain("import { env } from 'speexjs'")
    expect(writtenContent).toContain('export const Env = {')
  })

  it('detects PORT as number type', async () => {
    mockExistsSync.mockImplementation((p: string) => p.includes('.env'))
    mockReadFileSync.mockReturnValue('PORT=3000\n')
    let writtenContent = ''
    mockWriteFileSync.mockImplementation((_p: string, c: string) => {
      writtenContent = c
    })
    const { envGenerate } = await import('../src/cli/commands/env-generate.js')
    await envGenerate()
    expect(writtenContent).toMatch(/env\.int\('PORT', 3000\)/)
  })

  it('detects DEBUG as boolean type', async () => {
    mockExistsSync.mockImplementation((p: string) => p.includes('.env'))
    mockReadFileSync.mockReturnValue('DEBUG=true\n')
    let writtenContent = ''
    mockWriteFileSync.mockImplementation((_p: string, c: string) => {
      writtenContent = c
    })
    const { envGenerate } = await import('../src/cli/commands/env-generate.js')
    await envGenerate()
    expect(writtenContent).toMatch(/env\.bool\('DEBUG', true\)/)
  })
})

describe('MetricsStore', () => {
  let MetricsStore: any, Counter: any, Gauge: any, Histogram: any

  beforeAll(async () => {
    const mod = await import('../src/server/observability/metrics.js')
    MetricsStore = mod.MetricsStore
    Counter = mod.Counter
    Gauge = mod.Gauge
    Histogram = mod.Histogram
  })

  describe('Counter', () => {
    it('starts at 0', () => {
      expect(new Counter('test').get()).toBe(0)
    })
    it('increments by 1', () => {
      const c = new Counter('t')
      c.inc()
      expect(c.get()).toBe(1)
    })
    it('increments by custom value', () => {
      const c = new Counter('t')
      c.inc(5)
      expect(c.get()).toBe(5)
    })
    it('resets to 0', () => {
      const c = new Counter('t')
      c.inc(10)
      c.reset()
      expect(c.get()).toBe(0)
    })
    it('serializes with labels', () => {
      const c = new Counter('test', { method: 'GET' })
      c.inc(7)
      const s = c.serialize('requests')
      expect(s).toContain('method="GET"')
      expect(s).toContain('7')
    })
  })

  describe('Gauge', () => {
    it('starts at 0', () => {
      expect(new Gauge('t').get()).toBe(0)
    })
    it('sets a value', () => {
      const g = new Gauge('t')
      g.set(42)
      expect(g.get()).toBe(42)
    })
    it('increments and decrements', () => {
      const g = new Gauge('t')
      g.set(10)
      g.inc()
      expect(g.get()).toBe(11)
      g.dec(3)
      expect(g.get()).toBe(8)
    })
    it('can go negative', () => {
      const g = new Gauge('t')
      g.set(-5)
      expect(g.get()).toBe(-5)
    })
  })

  describe('Histogram', () => {
    it('starts empty', () => {
      const h = new Histogram('lat')
      expect(h.count).toBe(0)
      expect(h.sum).toBe(0)
    })
    it('records observations', () => {
      const h = new Histogram('lat')
      h.observe(100)
      h.observe(200)
      expect(h.count).toBe(2)
      expect(h.sum).toBe(300)
    })
    it('computes p50 percentile', () => {
      const h = new Histogram('lat')
      ;[10, 20, 30, 40, 50].forEach((v) => h.observe(v))
      expect(h.p50()).toBe(30)
    })
    it('computes p95 percentile', () => {
      const h = new Histogram('lat')
      for (let i = 1; i <= 20; i++) h.observe(i)
      expect(h.p95()).toBe(19)
    })
    it('computes p99 percentile', () => {
      const h = new Histogram('lat')
      for (let i = 1; i <= 100; i++) h.observe(i)
      expect(h.p99()).toBe(99)
    })
    it('returns 0 for empty histogram', () => {
      const h = new Histogram('lat')
      expect(h.p50()).toBe(0)
    })
    it('serializes Prometheus format', () => {
      const h = new Histogram('lat')
      h.observe(5)
      h.observe(25)
      h.observe(75)
      const s = h.serialize('http_dur')
      expect(s).toContain('_bucket{le=')
      expect(s).toContain('_sum')
      expect(s).toContain('_count')
      expect(s).toContain('le="+Inf"')
    })
  })

  describe('MetricsStore', () => {
    it('creates and retrieves metrics', () => {
      const store = new MetricsStore()
      const c = store.counter('req', 'Requests')
      c.inc(5)
      const g = store.gauge('mem', 'Memory')
      g.set(100)
      const h = store.histogram('lat', 'Latency')
      h.observe(50)
      expect(store.getCounter('req')?.get()).toBe(5)
      expect(store.getGauge('mem')?.get()).toBe(100)
      expect(store.getHistogram('lat')?.count).toBe(1)
    })
    it('produces Prometheus output', () => {
      const store = new MetricsStore()
      store.counter('http_reqs', 'Total requests').inc(42)
      const out = store.prometheusFormatted()
      expect(out).toContain('# HELP http_reqs')
      expect(out).toContain('# TYPE http_reqs counter')
      expect(out).toContain('http_reqs 42')
    })
    it('resetAll clears everything', () => {
      const store = new MetricsStore()
      store.counter('r', 'R').inc(5)
      store.resetAll()
      expect(store.getCounter('r')?.get()).toBe(0)
    })
    it('reports size', () => {
      const store = new MetricsStore()
      expect(store.size).toBe(0)
      store.counter('a', 'A')
      expect(store.size).toBe(1)
    })
  })
})

describe('Tracer', () => {
  let Span: any, Tracer: any

  beforeAll(async () => {
    const mod = await import('../src/server/observability/tracer.js')
    Span = mod.Span
    Tracer = mod.Tracer
  })

  describe('Span', () => {
    it('creates span with IDs', () => {
      const span = new Span('op', 'trace-123')
      expect(span.name).toBe('op')
      expect(span.traceId).toBe('trace-123')
      expect(span.spanId).toBeDefined()
    })
    it('setError changes status', () => {
      const span = new Span('op', 't1')
      span.setError('err')
      expect(span.status).toBe('error')
      expect(span.errorMessage).toBe('err')
    })
    it('finish sets endTime', () => {
      const span = new Span('op', 't1')
      span.finish()
      expect(span.endTime).not.toBeNull()
      expect(span.durationMs).toBeGreaterThanOrEqual(0)
    })
    it('toJSON returns all fields', () => {
      const span = new Span('op', 't1')
      span.finish()
      const j = span.toJSON()
      expect(j.traceId).toBe('t1')
      expect(j.spanId).toBe(span.spanId)
      expect(j.name).toBe('op')
    })
  })

  describe('Tracer', () => {
    it('withTraceAsync executes function', async () => {
      const tracer = new Tracer()
      const r = await tracer.withTraceAsync('t', async () => 'hello')
      expect(r).toBe('hello')
    })
    it('completes root span on success', async () => {
      const tracer = new Tracer()
      await tracer.withTraceAsync('op', async () => {})
      expect(tracer.getCompletedSpans().length).toBe(1)
    })
    it('sets span error on exception', async () => {
      const tracer = new Tracer()
      await expect(
        tracer.withTraceAsync('fail', async () => {
          throw new Error('oops')
        }),
      ).rejects.toThrow('oops')
      expect(tracer.getCompletedSpans()[0].status).toBe('error')
    })
    it('getTraceId returns ID within trace', async () => {
      const tracer = new Tracer()
      await tracer.withTraceAsync('t', async () => {
        expect(tracer.getTraceId()).toBeDefined()
      })
    })
    it('startSpan creates child span', async () => {
      const tracer = new Tracer()
      await tracer.withTraceAsync('parent', async () => {
        const child = tracer.startSpan('child')
        tracer.endSpan(child)
      })
      const spans = tracer.getCompletedSpans()
      expect(spans.find((s: any) => s.name === 'child')).toBeDefined()
    })
    it('clearCompletedSpans empties list', async () => {
      const tracer = new Tracer()
      await tracer.withTraceAsync('op', async () => {})
      tracer.clearCompletedSpans()
      expect(tracer.getCompletedSpans().length).toBe(0)
    })
  })
})

describe('N+1 Query Detection', () => {
  let NPlusOneDetector: any, normalizeSQL: any

  beforeAll(async () => {
    const mod = await import('../src/server/observability/n-plus-one.js')
    NPlusOneDetector = mod.NPlusOneDetector
    normalizeSQL = mod.normalizeSQL
  })

  describe('normalizeSQL', () => {
    it('replaces quoted strings', () => {
      expect(normalizeSQL("SELECT * FROM users WHERE name = 'john'")).toContain("'?'")
    })
    it('replaces integers with ?', () => {
      expect(normalizeSQL('SELECT * FROM users WHERE id = 42')).toBe('SELECT * FROM users WHERE id = ?')
    })
    it('collapses whitespace', () => {
      expect(normalizeSQL('SELECT   *   FROM   users')).toBe('SELECT * FROM users')
    })
    it('normalizes IN lists with 3+ items', () => {
      expect(normalizeSQL('SELECT * FROM users WHERE id IN (1, 2, 3, 4, 5)')).toBe('SELECT * FROM users WHERE id IN (?, ...)')
    })
    it('preserves IN lists with 1-2 items', () => {
      expect(normalizeSQL('SELECT * FROM users WHERE id IN (1, 2)')).toBe('SELECT * FROM users WHERE id IN (?, ?)')
    })
  })

  describe('NPlusOneDetector', () => {
    it('starts empty', () => {
      const d = new NPlusOneDetector()
      expect(d.patternCount).toBe(0)
      expect(d.totalQueries).toBe(0)
    })
    it('detects repeated query patterns', () => {
      const d = new NPlusOneDetector({ threshold: 3 })
      for (let i = 0; i < 5; i++) d.recordQuery(`SELECT * FROM users WHERE id = ${i}`)
      expect(d.hasCandidates).toBe(true)
      expect(d.getCandidates()[0].count).toBe(5)
    })
    it('does not flag below threshold', () => {
      const d = new NPlusOneDetector({ threshold: 3 })
      d.recordQuery('SELECT * FROM users WHERE id = 1')
      d.recordQuery('SELECT * FROM users WHERE id = 2')
      expect(d.hasCandidates).toBe(false)
    })
    it('clear resets data', () => {
      const d = new NPlusOneDetector()
      for (let i = 0; i < 4; i++) d.recordQuery(`SELECT * FROM u WHERE id = ${i}`)
      d.clear()
      expect(d.totalQueries).toBe(0)
    })
    it('tracks different patterns separately', () => {
      const d = new NPlusOneDetector({ threshold: 2 })
      d.recordQuery('SELECT * FROM users WHERE id = 1')
      d.recordQuery('SELECT * FROM posts WHERE id = 1')
      d.recordQuery('SELECT * FROM posts WHERE id = 2')
      expect(d.patternCount).toBe(2)
      expect(d.getCandidates().length).toBe(1)
    })
  })
})

describe('MigrationSafetyGuard', () => {
  let MigrationSafetyGuard: any, parseMigrationSource: any

  beforeAll(async () => {
    const mod = await import('../src/server/database/migration-safety.js')
    MigrationSafetyGuard = mod.MigrationSafetyGuard
    parseMigrationSource = mod.parseMigrationSource
  })

  it('detects dropTable in migration source', () => {
    const result = parseMigrationSource('schema.dropTable("users")')
    expect(result.length).toBe(1)
    expect(result[0].table).toBe('users')
    expect(result[0].operations[0].type).toBe('drop_table')
  })

  it('detects dropColumn in migration source', () => {
    const source = 'schema.alterTable("posts", (table) => { table.dropColumn("old_field") })'
    const result = parseMigrationSource(source)
    expect(result.length).toBe(1)
    expect(result[0].operations[0].type).toBe('drop_column')
  })

  it('detects dropTimestamps shorthand', () => {
    const result = parseMigrationSource('table.dropTimestamps()')
    expect(result.length).toBe(1)
    const ops = result[0].operations
    expect(ops.some((o: any) => o.column === 'created_at')).toBe(true)
    expect(ops.some((o: any) => o.column === 'updated_at')).toBe(true)
  })

  it('returns safe for empty diffs', () => {
    const guard = new MigrationSafetyGuard()
    const report = guard.inspect([])
    expect(report.safe).toBe(true)
    expect(report.warnings.length).toBe(0)
  })
})
