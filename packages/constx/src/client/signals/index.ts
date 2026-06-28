let activeTracker: (() => void) | null = null
let activeSources: Set<Subscribable> | null = null
let batchDepth = 0
const pendingUpdates = new Set<() => void>()

interface Subscribable {
  _subs: Set<() => void>
}

function flushPending(): void {
  const fns = [...pendingUpdates]
  pendingUpdates.clear()
  for (const fn of fns) fn()
}

function trackSource(node: Subscribable): void {
  if (activeSources) activeSources.add(node)
  if (activeTracker) node._subs.add(activeTracker)
}

export class Signal<T> {
  readonly _tag = 'signal' as const
  _subs = new Set<() => void>()
  private _value: T

  constructor(value: T) {
    this._value = value
  }

  get value(): T {
    trackSource(this)
    return this._value
  }

  set value(val: T) {
    if (val !== this._value) {
      this._value = val
      this._notify()
    }
  }

  peek(): T {
    return this._value
  }

  set(v: T): void {
    this.value = v
  }

  update(fn: (v: T) => T): void {
    this.value = fn(this._value)
  }

  subscribe(fn: (val: T) => void): () => void {
    const cb = () => fn(this._value)
    this._subs.add(cb)
    return () => this._subs.delete(cb)
  }

  toJSON(): T {
    return this._value
  }

  toString(): string {
    return String(this._value)
  }

  valueOf(): T {
    return this._value
  }

  *[Symbol.iterator](): Iterator<T> {
    yield this._value
  }

  private _notify(): void {
    if (batchDepth > 0) {
      for (const s of this._subs) pendingUpdates.add(s)
    } else {
      const subs = [...this._subs]
      for (const s of subs) s()
    }
  }
}

export class Computed<T> {
  readonly _tag = 'computed' as const
  _subs = new Set<() => void>()
  private _fn: () => T
  private _value!: T
  private _dirty = true
  private _sources = new Set<Subscribable>()

  private _onDepChange = (): void => {
    if (!this._dirty) {
      this._dirty = true
      for (const s of [...this._subs]) s()
    }
  }

  constructor(fn: () => T) {
    this._fn = fn
  }

  get value(): T {
    trackSource(this)
    if (this._dirty) this._eval()
    return this._value
  }

  peek(): T {
    if (this._dirty) this._eval()
    return this._value
  }

  subscribe(fn: (val: T) => void): () => void {
    this.value
    const cb = () => fn(this._value)
    this._subs.add(cb)
    return () => this._subs.delete(cb)
  }

  toJSON(): T {
    return this.value
  }

  toString(): string {
    return String(this.value)
  }

  valueOf(): T {
    return this.value
  }

  private _eval(): void {
    for (const src of this._sources) {
      src._subs.delete(this._onDepChange)
    }
    this._sources.clear()
    this._dirty = false

    const prevSources = activeSources
    const prevTracker = activeTracker
    activeSources = new Set()
    activeTracker = null
    try {
      this._value = this._fn()
      this._sources = activeSources
    } finally {
      activeSources = prevSources
      activeTracker = prevTracker
    }

    for (const src of this._sources) {
      src._subs.add(this._onDepChange)
    }
  }
}

export class Effect {
  private _fn: () => void | (() => void)
  private _sources = new Set<Subscribable>()
  private _cleanup: (() => void) | undefined
  private _alive = true

  constructor(fn: () => void | (() => void)) {
    this._fn = fn
    this._run()
  }

  get alive(): boolean {
    return this._alive
  }

  stop(): void {
    if (!this._alive) return
    this._alive = false
    this._removeSubscriptions()
    if (this._cleanup) {
      this._cleanup()
      this._cleanup = undefined
    }
  }

  start(): void {
    if (this._alive) return
    this._alive = true
    this._run()
  }

  private _removeSubscriptions(): void {
    for (const src of this._sources) {
      src._subs.delete(this._run)
    }
    this._sources.clear()
  }

  private _run = (): void => {
    if (!this._alive) return
    this._removeSubscriptions()
    if (this._cleanup) {
      this._cleanup()
      this._cleanup = undefined
    }

    const prevTracker = activeTracker
    const prevSources = activeSources
    activeTracker = this._run
    activeSources = this._sources
    try {
      const result = this._fn()
      if (typeof result === 'function') {
        this._cleanup = result as () => void
      }
    } finally {
      activeTracker = prevTracker
      activeSources = prevSources
    }
  }
}

export function signal<T>(initial: T): Signal<T> {
  return new Signal(initial)
}

export function computed<T>(fn: () => T): Computed<T> {
  return new Computed(fn)
}

export function effect(fn: () => void | (() => void)): Effect {
  return new Effect(fn)
}

export function untracked<T>(fn: () => T): T {
  const prevTracker = activeTracker
  const prevSources = activeSources
  activeTracker = null
  activeSources = null
  try {
    return fn()
  } finally {
    activeTracker = prevTracker
    activeSources = prevSources
  }
}

export function batch<T>(fn: () => T): T {
  batchDepth++
  try {
    return fn()
  } finally {
    batchDepth--
    if (batchDepth === 0) {
      flushPending()
    }
  }
}

export function isSignal(val: unknown): val is Signal<unknown> {
  return val instanceof Signal
}

export function isComputed(val: unknown): val is Computed<unknown> {
  return val instanceof Computed
}

export function toSignal<T>(value: T | Signal<T>): Signal<T> {
  if (value instanceof Signal) return value
  return signal(value)
}

export function mergeSignals<T extends Record<string, Signal<unknown>>>(signals: T): Signal<{ [K in keyof T]: T[K] extends Signal<infer V> ? V : never }> {
  return computed(() => {
    const result: Record<string, unknown> = {}
    for (const key of Object.keys(signals)) {
      result[key] = (signals as Record<string, Signal<unknown>>)[key]!.value
    }
    return result as { [K in keyof T]: T[K] extends Signal<infer V> ? V : never }
  }) as unknown as Signal<{ [K in keyof T]: T[K] extends Signal<infer V> ? V : never }>
}

export { type Subscribable }
