import { vi, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'

// ─── Source Imports ───────────────────────────────────────
import {
  signal, computed, effect, untracked, batch,
  Signal, Computed, Effect,
  isSignal, isComputed, toSignal, mergeSignals,
} from '../src/client/signals/index.js'
import type { Subscribable } from '../src/client/signals/index.js'
import {
  h, text, fragment, createComponent, normalizeChild,
  render, patch, renderToString, renderToStream,
} from '../src/client/vdom/index.js'
import type { VNode, VElement, VText, VFragment, VComponent, Component, ComponentContext } from '../src/client/vdom/index.js'
import { ClientRouter } from '../src/client/router.js'
import type { RouteDefinition, RouteGuard, RouterOptions } from '../src/client/router.js'

// ─── Mock DOM (plain objects, no jsdom needed) ────────────

function createMockWindow() {
  const popstateHandlers: Array<() => void> = []
  const location: { pathname: string; search: string; hash: string; href: string } = {
    pathname: '/',
    search: '',
    hash: '',
    href: 'http://localhost/',
  }
  const win = {
    location,
    addEventListener: vi.fn((event: string, handler: () => void) => {
      if (event === 'popstate') popstateHandlers.push(handler)
    }),
    removeEventListener: vi.fn(),
    _popstateHandlers: popstateHandlers,
    _triggerPopstate() {
      for (const h of [...popstateHandlers]) h()
    },
  }
  return win
}

function createMockHistory() {
  return {
    pushState: vi.fn(),
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    scrollRestoration: 'auto',
    length: 1,
    state: null as unknown,
  }
}

function mockElem(tag: string) {
  const children: any[] = []
  const attrs: Record<string, string> = {}
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {}
  const el: Record<string, unknown> = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    parentNode: null,
    childNodes: children,
    attributes: attrs,
    style: {} as Record<string, string>,
    innerHTML: '',
    _listeners: listeners,
    setAttribute(key: string, value: string) { attrs[key] = value },
    removeAttribute(key: string) { delete attrs[key] },
    getAttribute(key: string) { return attrs[key] ?? null },
    addEventListener(event: string, fn: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = []
      listeners[event].push(fn)
    },
    removeEventListener(event: string, fn: (...args: unknown[]) => void) {
      if (listeners[event]) listeners[event] = listeners[event].filter((h) => h !== fn)
    },
    appendChild(child: unknown) {
      children.push(child);
      (child as Record<string, unknown>).parentNode = el
      return child
    },
    removeChild(child: unknown) {
      const idx = children.indexOf(child)
      if (idx >= 0) children.splice(idx, 1);
      (child as Record<string, unknown>).parentNode = null
      return child
    },
    replaceChild(newChild: unknown, oldChild: unknown) {
      const idx = children.indexOf(oldChild)
      if (idx >= 0) children[idx] = newChild;
      (newChild as Record<string, unknown>).parentNode = el;
      (oldChild as Record<string, unknown>).parentNode = null
      return oldChild
    },
    get firstChild() { return children[0] ?? null },
    cloneNode() { return { ...el, childNodes: [...children] } },
  }
  return el
}

function mockText(text: string) {
  return {
    nodeType: 3,
    textContent: text,
    parentNode: null,
    childNodes: [],
  }
}

function mockComment(text: string) {
  return {
    nodeType: 8,
    data: text,
    parentNode: null,
    childNodes: [],
  }
}

function mockFragment() {
  const children: any[] = []
  return {
    nodeType: 11,
    parentNode: null,
    childNodes: children,
    appendChild(child: unknown) {
      children.push(child);
      (child as Record<string, unknown>).parentNode = this
      return child
    },
    removeChild(child: unknown) {
      const idx = children.indexOf(child)
      if (idx >= 0) children.splice(idx, 1);
      (child as Record<string, unknown>).parentNode = null
      return child
    },
  }
}

let _mockDoc: Record<string, unknown>
function createMockDoc() {
  _mockDoc = {
    createElement: vi.fn((tag: string) => mockElem(tag)),
    createTextNode: vi.fn((t: string) => mockText(t)),
    createDocumentFragment: vi.fn(() => mockFragment()),
    createComment: vi.fn((t: string) => mockComment(t)),
    createElementNS: vi.fn((_ns: string, tag: string) => mockElem(tag)),
  }
  return _mockDoc
}

function stubDOM() {
  const doc = createMockDoc()
  vi.stubGlobal('document', doc)
  vi.stubGlobal('Element', class {})
  vi.stubGlobal('HTMLElement', class {})
  vi.stubGlobal('Node', class {})
  vi.stubGlobal('Text', class {})
  return { doc }
}

// ═══════════════════════════════════════════════════════════
//  1.  SIGNALS
// ═══════════════════════════════════════════════════════════

describe('signals', () => {
  describe('signal()', () => {
    it('creates a signal with the given initial value', () => {
      const s = signal(42)
      expect(s.value).toBe(42)
    })

    it('accepts undefined initial value', () => {
      const s = signal<undefined>(undefined)
      expect(s.value).toBeUndefined()
    })

    it('accepts null initial value', () => {
      const s = signal<null>(null)
      expect(s.value).toBeNull()
    })

    it('accepts object initial value', () => {
      const s = signal({ a: 1, b: 2 })
      expect(s.value).toEqual({ a: 1, b: 2 })
    })

    it('accepts array initial value', () => {
      const s = signal([1, 2, 3])
      expect(s.value).toEqual([1, 2, 3])
    })
  })

  describe('Signal.set() / value setter', () => {
    it('updates value via setter', () => {
      const s = signal(1)
      s.value = 5
      expect(s.value).toBe(5)
    })

    it('updates value via set method', () => {
      const s = signal(1)
      s.set(10)
      expect(s.value).toBe(10)
    })

    it('does not notify on same value', () => {
      const fn = vi.fn()
      const s = signal(42)
      s.subscribe(fn)
      s.value = 42
      expect(fn).not.toHaveBeenCalled()
    })

    it('does not notify on same object reference', () => {
      const fn = vi.fn()
      const obj = { x: 1 }
      const s = signal(obj)
      s.subscribe(fn)
      s.value = obj
      expect(fn).not.toHaveBeenCalled()
    })

    it('notifies on different object reference', () => {
      const fn = vi.fn()
      const s = signal({ x: 1 })
      s.subscribe(fn)
      s.value = { x: 1 }
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('Signal.value (getter)', () => {
    it('returns the current value', () => {
      const s = signal('hello')
      expect(s.value).toBe('hello')
    })

    it('returns updated value after set', () => {
      const s = signal(0)
      s.value = 99
      expect(s.value).toBe(99)
    })
  })

  describe('Signal.peek()', () => {
    it('returns value without tracking', () => {
      const s = signal(10)
      const spy = vi.fn(() => s.peek())
      const c = computed(spy)
      expect(c.value).toBe(10)
      s.value = 20
      expect(c.value).toBe(10)
      expect(spy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Signal.update()', () => {
    it('updates value via updater function', () => {
      const s = signal(5)
      s.update((v) => v * 2)
      expect(s.value).toBe(10)
    })

    it('passes current value to updater', () => {
      const s = signal('a')
      s.update((v) => v + 'b')
      expect(s.value).toBe('ab')
    })
  })

  describe('Signal.subscribe()', () => {
    it('calls subscriber on value change', () => {
      const fn = vi.fn()
      const s = signal(1)
      s.subscribe(fn)
      s.value = 2
      expect(fn).toHaveBeenCalledWith(2)
    })

    it('returns unsubscribe function', () => {
      const fn = vi.fn()
      const s = signal(1)
      const unsub = s.subscribe(fn)
      s.value = 2
      expect(fn).toHaveBeenCalledTimes(1)
      unsub()
      s.value = 3
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('supports multiple subscribers', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      const s = signal(0)
      s.subscribe(fn1)
      s.subscribe(fn2)
      s.value = 1
      expect(fn1).toHaveBeenCalledTimes(1)
      expect(fn2).toHaveBeenCalledTimes(1)
    })

    it('notifies subscriber of current value on change', () => {
      const fn = vi.fn()
      const s = signal('initial')
      s.subscribe(fn)
      s.value = 'changed'
      expect(fn).toHaveBeenCalledWith('changed')
    })
  })

  describe('computed()', () => {
    it('derives value from signals', () => {
      const a = signal(2)
      const b = signal(3)
      const c = computed(() => a.value + b.value)
      expect(c.value).toBe(5)
    })

    it('updates when dependencies change', () => {
      const a = signal(10)
      const b = computed(() => a.value * 2)
      expect(b.value).toBe(20)
      a.value = 15
      expect(b.value).toBe(30)
    })

    it('is lazy: does not evaluate until read', () => {
      const fn = vi.fn(() => 42)
      const c = computed(fn)
      expect(fn).not.toHaveBeenCalled()
      expect(c.value).toBe(42)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('caches value after evaluation', () => {
      const fn = vi.fn(() => Math.random())
      const a = signal(1)
      const c = computed(() => { fn(); return a.value })
      c.value
      c.value
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('supports computed depending on another computed', () => {
      const a = signal(3)
      const b = computed(() => a.value * 2)
      const c = computed(() => b.value + 1)
      expect(c.value).toBe(7)
      a.value = 5
      expect(c.value).toBe(11)
    })

    it('supports computed with no dependencies', () => {
      const c = computed(() => 99)
      expect(c.value).toBe(99)
    })

    it('supports computed with multiple dependency levels', () => {
      const a = signal(1)
      const b = signal(2)
      const c = computed(() => a.value + b.value)
      const d = computed(() => c.value * 10)
      expect(d.value).toBe(30)
      a.value = 3
      expect(d.value).toBe(50)
      b.value = 4
      expect(d.value).toBe(70)
    })

    it('re-evaluates lazily after dependency changes', () => {
      const fn = vi.fn()
      const a = signal(1)
      const c = computed(() => { fn(); return a.value + 1 })
      expect(c.value).toBe(2)
      expect(fn).toHaveBeenCalledTimes(1)
      a.value = 10
      expect(fn).toHaveBeenCalledTimes(1)
      expect(c.value).toBe(11)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('Computed.peek()', () => {
    it('returns value without tracking', () => {
      const a = signal(1)
      const c = computed(() => a.value * 2)
      expect(c.peek()).toBe(2)
      a.value = 5
      expect(c.peek()).toBe(10)
    })
  })

  describe('Computed.subscribe()', () => {
    it('notifies on dependency change', () => {
      const fn = vi.fn()
      const a = signal(1)
      const c = computed(() => a.value * 10)
      c.subscribe(fn)
      a.value = 5
      expect(fn).toHaveBeenCalled()
    })

    it('returns unsubscribe function', () => {
      const fn = vi.fn()
      const a = signal(1)
      const c = computed(() => a.value)
      const unsub = c.subscribe(fn)
      a.value = 2
      expect(fn).toHaveBeenCalledTimes(1)
      unsub()
      a.value = 3
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('effect()', () => {
    it('runs immediately on creation', () => {
      let result = 0
      effect(() => { result = 42 })
      expect(result).toBe(42)
    })

    it('re-runs when signal dependencies change', () => {
      let result = 0
      const s = signal(5)
      effect(() => { result = s.value * 2 })
      expect(result).toBe(10)
      s.value = 10
      expect(result).toBe(20)
    })

    it('re-runs when computed dependencies change', () => {
      let result = 0
      const a = signal(3)
      const b = computed(() => a.value * 3)
      effect(() => { result = b.value })
      expect(result).toBe(9)
      a.value = 4
      expect(result).toBe(12)
    })

    it('tracks new dependencies on each run', () => {
      let result = ''
      const cond = signal(true)
      const a = signal('A')
      const b = signal('B')
      effect(() => {
        result = cond.value ? a.value : b.value
      })
      expect(result).toBe('A')
      b.value = 'B2'
      expect(result).toBe('A')
      cond.value = false
      expect(result).toBe('B2')
    })

    it('supports cleanup function returned from effect', () => {
      const cleanup = vi.fn()
      const s = signal(1)
      effect(() => {
        s.value
        return cleanup
      })
      expect(cleanup).not.toHaveBeenCalled()
      s.value = 2
      expect(cleanup).toHaveBeenCalledTimes(1)
      s.value = 3
      expect(cleanup).toHaveBeenCalledTimes(2)
    })
  })

  describe('Effect lifecycle', () => {
    it('stop() prevents further reactions', () => {
      let count = 0
      const s = signal(1)
      const e = effect(() => { count = s.value })
      expect(count).toBe(1)
      e.stop()
      s.value = 5
      expect(count).toBe(1)
    })

    it('start() resumes reactions', () => {
      let count = 0
      const s = signal(1)
      const e = effect(() => { count = s.value })
      e.stop()
      s.value = 5
      expect(count).toBe(1)
      e.start()
      expect(count).toBe(5)
      s.value = 10
      expect(count).toBe(10)
    })

    it('alive property reflects lifecycle state', () => {
      const e = effect(() => {})
      expect(e.alive).toBe(true)
      e.stop()
      expect(e.alive).toBe(false)
      e.start()
      expect(e.alive).toBe(true)
    })

    it('stop() runs cleanup function', () => {
      const cleanup = vi.fn()
      const e = effect(() => cleanup)
      expect(cleanup).not.toHaveBeenCalled()
      e.stop()
      expect(cleanup).toHaveBeenCalledTimes(1)
    })

    it('start() after stop does not call stale cleanup before re-run', () => {
      const cleanup = vi.fn()
      const s = signal(1)
      const e = effect(() => { s.value; return cleanup })
      e.stop()
      expect(cleanup).toHaveBeenCalledTimes(1)
      cleanup.mockClear()
      e.start()
      expect(cleanup).not.toHaveBeenCalled()
      s.value = 2
      expect(cleanup).toHaveBeenCalledTimes(1)
    })
  })

  describe('untracked()', () => {
    it('reads signal without tracking', () => {
      const s = signal(1)
      const c = computed(() => untracked(() => s.value))
      expect(c.value).toBe(1)
      s.value = 5
      expect(c.value).toBe(1)
    })

    it('returns the function result', () => {
      const result = untracked(() => 99)
      expect(result).toBe(99)
    })

    it('does not create dependency on signals inside', () => {
      const fn = vi.fn()
      const s = signal(1)
      const c = computed(() => { fn(); return untracked(() => s.value) })
      c.value
      expect(fn).toHaveBeenCalledTimes(1)
      s.value = 2
      c.peek()
      expect(fn).toHaveBeenCalledTimes(1)
    })
  })

  describe('batch()', () => {
    it('batches multiple updates into one notification', () => {
      let count = 0
      const a = signal(1)
      const b = signal(2)
      effect(() => { count = a.value + b.value })
      expect(count).toBe(3)
      batch(() => {
        a.value = 10
        b.value = 20
      })
      expect(count).toBe(30)
    })

    it('returns the batch function result', () => {
      const result = batch(() => 42)
      expect(result).toBe(42)
    })

    it('supports nested batch calls', () => {
      let count = 0
      const a = signal(1)
      effect(() => { count = a.value })
      batch(() => {
        a.value = 2
        batch(() => { a.value = 3 })
      })
      expect(count).toBe(3)
    })

    it('notifies only once for multiple changes in batch', () => {
      const fn = vi.fn()
      const a = signal(1)
      const b = signal(2)
      const c = computed(() => a.value + b.value)
      c.subscribe(fn)
      batch(() => {
        a.value = 5
        b.value = 10
      })
      expect(fn).toHaveBeenCalledTimes(1)
      expect(c.value).toBe(15)
    })

    it('flushes pending updates after batch completes', () => {
      let order: number[] = []
      const a = signal(1)
      effect(() => { order.push(a.value) })
      order = []
      batch(() => {
        a.value = 2
        a.value = 3
      })
      expect(order).toEqual([3])
    })
  })

  describe('isSignal()', () => {
    it('returns true for Signal', () => {
      expect(isSignal(signal(1))).toBe(true)
    })

    it('returns false for Computed', () => {
      expect(isSignal(computed(() => 1))).toBe(false)
    })

    it('returns false for plain values', () => {
      expect(isSignal(42)).toBe(false)
      expect(isSignal('str')).toBe(false)
      expect(isSignal(null)).toBe(false)
      expect(isSignal(undefined)).toBe(false)
      expect(isSignal({})).toBe(false)
    })
  })

  describe('isComputed()', () => {
    it('returns true for Computed', () => {
      expect(isComputed(computed(() => 1))).toBe(true)
    })

    it('returns false for Signal', () => {
      expect(isComputed(signal(1))).toBe(false)
    })

    it('returns false for plain values', () => {
      expect(isComputed(42)).toBe(false)
      expect(isComputed({})).toBe(false)
    })
  })

  describe('toSignal()', () => {
    it('returns the same Signal if already a Signal', () => {
      const s = signal(1)
      expect(toSignal(s)).toBe(s)
    })

    it('wraps a plain value in a Signal', () => {
      const s = toSignal(42)
      expect(s).toBeInstanceOf(Signal)
      expect(s.value).toBe(42)
    })
  })

  describe('mergeSignals()', () => {
    it('combines signals into a single computed object', () => {
      const a = signal('hello')
      const b = signal(42)
      const m = mergeSignals({ a, b })
      expect(m.value).toEqual({ a: 'hello', b: 42 })
    })

    it('updates when any source signal changes', () => {
      const a = signal(10)
      const b = signal(20)
      const m = mergeSignals({ a, b })
      expect(m.value).toEqual({ a: 10, b: 20 })
      a.value = 99
      expect(m.value).toEqual({ a: 99, b: 20 })
      b.value = 200
      expect(m.value).toEqual({ a: 99, b: 200 })
    })

    it('returns a Signal (Computed instance)', () => {
      const m = mergeSignals({ x: signal(1) })
      expect(m).toBeInstanceOf(Computed)
    })
  })

  describe('Signal.toJSON()', () => {
    it('returns the current value', () => {
      const s = signal(42)
      expect(s.toJSON()).toBe(42)
    })

    it('serializes via JSON.stringify', () => {
      const s = signal(99)
      expect(JSON.stringify(s)).toBe('99')
    })

    it('serializes objects correctly', () => {
      const s = signal({ a: 1, b: [2, 3] })
      expect(JSON.stringify(s)).toBe('{"a":1,"b":[2,3]}')
    })
  })

  describe('Signal.toString()', () => {
    it('returns string representation', () => {
      const s = signal(42)
      expect(s.toString()).toBe('42')
    })

    it('returns string for string values', () => {
      const s = signal('hello')
      expect(s.toString()).toBe('hello')
    })
  })

  describe('Signal.valueOf()', () => {
    it('returns the primitive value', () => {
      const s = signal(42)
      expect(s.valueOf()).toBe(42)
    })

    it('allows arithmetic operators', () => {
      const s = signal(10)
      expect(s.valueOf() + 5).toBe(15)
    })
  })

  describe('Signal iterator', () => {
    it('is iterable (yields current value)', () => {
      const s = signal(42)
      const [val] = s
      expect(val).toBe(42)
    })

    it('works with spread operator', () => {
      const s = signal('test')
      expect([...s]).toEqual(['test'])
    })
  })

  describe('Subscribable interface', () => {
    it('Signal has _subs Set', () => {
      const s = signal(1)
      expect(s._subs).toBeInstanceOf(Set)
    })

    it('Computed has _subs Set', () => {
      const c = computed(() => 1)
      expect(c._subs).toBeInstanceOf(Set)
    })

    it('Subscribable type marks objects with _subs', () => {
      const s: Subscribable = signal(1)
      expect(s._subs).toBeInstanceOf(Set)
    })
  })
})

// ═══════════════════════════════════════════════════════════
//  2.  VDOM
// ═══════════════════════════════════════════════════════════

describe('VDOM', () => {
  describe('h()', () => {
    it('creates a VElement with tag and no props', () => {
      const v = h('div') as VElement
      expect(v.type).toBe('element')
      expect(v.tag).toBe('div')
      expect(v.props).toEqual({})
      expect(v.children).toEqual([])
    })

    it('creates a VElement with props', () => {
      const v = h('div', { id: 'main', class: 'container' }) as VElement
      expect(v.type).toBe('element')
      expect(v.tag).toBe('div')
      expect(v.props.id).toBe('main')
      expect(v.props.class).toBe('container')
    })

    it('creates a VElement with children', () => {
      const v = h('ul', null, h('li', null, 'a'), h('li', null, 'b')) as VElement
      expect(v.type).toBe('element')
      expect(v.tag).toBe('ul')
      expect(v.children).toHaveLength(2)
      expect((v.children[0] as VElement).tag).toBe('li')
    })

    it('creates a VElement with text child', () => {
      const v = h('span', null, 'hello') as VElement
      expect(v.type).toBe('element')
      expect((v.children[0] as VText).type).toBe('text')
      expect((v.children[0] as VText).text).toBe('hello')
    })

    it('creates a VElement with numeric child', () => {
      const v = h('span', null, 42) as VElement
      expect((v.children[0] as VText).text).toBe('42')
    })

    it('stores key in props and top-level key', () => {
      const v = h('div', { key: 'my-key', id: 'x' }) as VElement
      expect(v.key).toBe('my-key')
      expect(v.props.key).toBe('my-key')
    })

    it('creates a VComponent when tag is a function', () => {
      const Comp: Component = () => h('div')
      const v = h(Comp, { propA: 1 }) as VComponent
      expect(v.type).toBe('component')
      expect(v.component).toBe(Comp)
      expect(v.props.propA).toBe(1)
    })

    it('passes children to component props', () => {
      const Comp: Component = () => h('div')
      const v = h(Comp, null, h('span'), h('span')) as VComponent
      expect(v.type).toBe('component')
      expect(v.props.children).toHaveLength(2)
    })
  })

  describe('text()', () => {
    it('creates a VText with the given content', () => {
      const t = text('hello world')
      expect(t.type).toBe('text')
      expect(t.text).toBe('hello world')
    })

    it('creates a VText with empty string', () => {
      const t = text('')
      expect(t.type).toBe('text')
      expect(t.text).toBe('')
    })
  })

  describe('fragment()', () => {
    it('creates a VFragment with multiple children', () => {
      const f = fragment(h('a'), h('b')) as VFragment
      expect(f.type).toBe('fragment')
      expect(f.children).toHaveLength(2)
    })

    it('returns the child directly when single child', () => {
      const v = h('div')
      const f = fragment(v)
      expect(f).toBe(v)
    })

    it('returns empty text when no children', () => {
      const f = fragment()
      expect((f as VText).type).toBe('text')
      expect((f as VText).text).toBe('')
    })

    it('flattens nested arrays', () => {
      const f = fragment([h('a'), h('b')], h('c')) as VFragment
      expect(f.type).toBe('fragment')
      expect(f.children).toHaveLength(3)
    })

    it('filters out null/boolean children', () => {
      const f = fragment(h('a'), null, false && h('b'), h('c')) as VFragment
      expect(f.children).toHaveLength(2)
    })
  })

  describe('createComponent()', () => {
    it('creates a VComponent with component function', () => {
      const Comp: Component = (props) => h('div', null, props.label as string)
      const v = createComponent(Comp, { label: 'test' })
      expect(v.type).toBe('component')
      expect(v.component).toBe(Comp)
      expect(v.props.label).toBe('test')
      expect(v.props.children).toBeUndefined()
    })

    it('passes children to component props', () => {
      const Comp: Component = () => h('div')
      const v = createComponent(Comp, {}, h('span'), 'text')
      expect(v.props.children).toHaveLength(2)
    })

    it('creates VComponent without props', () => {
      const Comp: Component = () => h('div')
      const v = createComponent(Comp)
      expect(v.type).toBe('component')
      expect(v.props).toEqual({})
    })
  })

  describe('normalizeChild()', () => {
    it('returns null for null', () => {
      expect(normalizeChild(null)).toBeNull()
    })

    it('returns null for undefined', () => {
      expect(normalizeChild(undefined)).toBeNull()
    })

    it('returns null for boolean', () => {
      expect(normalizeChild(true)).toBeNull()
      expect(normalizeChild(false)).toBeNull()
    })

    it('creates VText for strings', () => {
      const r = normalizeChild('hello') as VText
      expect(r.type).toBe('text')
      expect(r.text).toBe('hello')
    })

    it('creates VText for numbers', () => {
      const r = normalizeChild(42) as VText
      expect(r.type).toBe('text')
      expect(r.text).toBe('42')
    })

    it('creates VText for zero', () => {
      const r = normalizeChild(0) as VText
      expect(r.type).toBe('text')
      expect(r.text).toBe('0')
    })

    it('creates VSignalNode for Signal', () => {
      const s = signal(text('hello'))
      const r = normalizeChild(s)
      expect(r).not.toBeNull()
      expect((r as any).type).toBe('signal')
    })

    it('creates VSignalNode for Computed', () => {
      const c = computed(() => text('hello'))
      const r = normalizeChild(c)
      expect((r as any).type).toBe('signal')
    })

    it('passes through existing VNode objects', () => {
      const vnode: VNode = { type: 'text', text: 'passthrough' }
      const r = normalizeChild(vnode)
      expect(r).toBe(vnode)
    })

    it('handles functions as components', () => {
      const Comp: Component = () => h('div')
      const r = normalizeChild(Comp) as VComponent
      expect(r.type).toBe('component')
      expect(r.component).toBe(Comp)
    })

    it('handles array input returning fragment for multiple', () => {
      const r = normalizeChild([h('a'), h('b')]) as VFragment
      expect(r.type).toBe('fragment')
      expect(r.children).toHaveLength(2)
    })

    it('handles empty array returning null', () => {
      expect(normalizeChild([])).toBeNull()
    })

    it('handles single-element array returning the child directly', () => {
      const v = h('div')
      const r = normalizeChild([v])
      expect(r).toBe(v)
    })

    it('flattens deeply nested arrays', () => {
      const a = h('a')
      const b = h('b')
      const r = normalizeChild([[a, [b]]]) as VFragment
      expect(r.children).toHaveLength(2)
    })

    it('converts unknown objects to text', () => {
      const r = normalizeChild({ custom: true }) as VText
      expect(r.type).toBe('text')
    })

    it('returns null when all children in array are filtered out', () => {
      expect(normalizeChild([null, undefined, false])).toBeNull()
    })
  })

  describe('VNode type structure', () => {
    it('VElement has correct shape', () => {
      const v: VElement = { type: 'element', tag: 'div', props: {}, children: [] }
      expect(v.type).toBe('element')
      expect(v.tag).toBe('div')
      expect(v.props).toEqual({})
      expect(v.children).toEqual([])
    })

    it('VText has correct shape', () => {
      const v: VText = { type: 'text', text: 'hello' }
      expect(v.type).toBe('text')
      expect(v.text).toBe('hello')
    })

    it('VFragment has correct shape', () => {
      const v: VFragment = { type: 'fragment', children: [] }
      expect(v.type).toBe('fragment')
      expect(v.children).toEqual([])
    })

    it('VComponent has correct shape', () => {
      const Comp: Component = () => h('div')
      const v: VComponent = { type: 'component', component: Comp, props: {} }
      expect(v.type).toBe('component')
      expect(v.component).toBe(Comp)
      expect(v.props).toEqual({})
    })

    it('VNode union type accepts all variants', () => {
      const nodes: VNode[] = [
        { type: 'element', tag: 'p', props: {}, children: [] },
        { type: 'text', text: 'hello' },
        { type: 'fragment', children: [] },
        { type: 'component', component: () => h('div'), props: {} },
      ]
      expect(nodes).toHaveLength(4)
    })
  })

  describe('Component interface', () => {
    it('simple component returns VNode', () => {
      const Comp: Component = () => h('div', null, 'hello')
      const result = Comp({})
      expect(result.type).toBe('element')
      expect((result as VElement).tag).toBe('div')
    })

    it('component receives props', () => {
      const Comp: Component = (props) => h('span', null, String(props.label))
      const result = Comp({ label: 'test' })
      expect((result as VElement).tag).toBe('span')
    })

    it('component receives context with signal helpers', () => {
      const Comp: Component = (_props, ctx) => {
        expect(ctx).toBeDefined()
        expect(typeof ctx?.signal).toBe('function')
        expect(typeof ctx?.computed).toBe('function')
        expect(typeof ctx?.effect).toBe('function')
        return h('div')
      }
      const ctx: ComponentContext = {
        signal, computed, effect,
        props: {},
      }
      const result = Comp({}, ctx)
      expect((result as VElement).tag).toBe('div')
    })

    it('async component returns a promise', async () => {
      const AsyncComp: Component = () => Promise.resolve(h('div'))
      const result = AsyncComp({})
      expect(result).toBeInstanceOf(Promise)
      const resolved = await result
      expect((resolved as VElement).tag).toBe('div')
    })
  })

  describe('renderToString()', () => {
    it('renders a simple element', () => {
      const v = h('div', null, 'hello')
      expect(renderToString(v)).toBe('<div>hello</div>')
    })

    it('renders element with attributes', () => {
      const v = h('input', { type: 'text', disabled: true })
      expect(renderToString(v)).toBe('<input type="text" disabled>')
    })

    it('renders nested elements', () => {
      const v = h('div', { id: 'root' }, h('span', { class: 'hl' }, 'text'))
      expect(renderToString(v)).toBe('<div id="root"><span class="hl">text</span></div>')
    })

    it('renders fragment', () => {
      const v = fragment(h('a'), h('b'))
      expect(renderToString(v)).toBe('<a></a><b></b>')
    })

    it('renders text node', () => {
      expect(renderToString(text('hello'))).toBe('hello')
    })

    it('renders component', () => {
      const Comp: Component = () => h('p', null, 'comp')
      const v = createComponent(Comp)
      expect(renderToString(v)).toBe('<p>comp</p>')
    })

    it('renders signal node', () => {
      const s = signal(text('dynamic'))
      const v = normalizeChild(s)!
      expect(renderToString(v)).toBe('dynamic')
    })

    it('html-escapes text content', () => {
      const v = h('div', null, '<script>alert(1)</script>')
      expect(renderToString(v)).toBe('<div>&lt;script&gt;alert(1)&lt;/script&gt;</div>')
    })

    it('renders style as object', () => {
      const v = h('div', { style: { color: 'red', fontSize: '14px' } })
      expect(renderToString(v)).toContain('style="')
      expect(renderToString(v)).toContain('color:red')
      expect(renderToString(v)).toContain('font-size:14px')
    })

    it('renders class from className', () => {
      const v = h('div', { className: 'foo bar' })
      expect(renderToString(v)).toBe('<div class="foo bar"></div>')
    })

    it('renders htmlFor as for attribute', () => {
      const v = h('label', { htmlFor: 'input-id' })
      expect(renderToString(v)).toBe('<label for="input-id"></label>')
    })

    it('renders void elements without closing tag', () => {
      const v = h('br')
      expect(renderToString(v)).toBe('<br>')
    })

    it('includes data-* attributes', () => {
      const v = h('div', { 'data-testid': 'root' })
      expect(renderToString(v)).toBe('<div data-testid="root"></div>')
    })

    it('skips event handler props', () => {
      const v = h('button', { onClick: () => {} })
      expect(renderToString(v)).toBe('<button></button>')
    })
  })

  describe('renderToStream()', () => {
    it('creates a ReadableStream', () => {
      const v = h('div', null, 'test')
      const stream = renderToStream(v)
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('streams rendered HTML', async () => {
      const v = h('p', { id: 'x' }, 'hello')
      const stream = renderToStream(v)
      const reader = stream.getReader()
      const { value, done } = await reader.read()
      expect(done).toBe(false)
      expect(value).toBe('<p id="x">hello</p>')
    })
  })

  describe('render() (DOM-dependent)', () => {
    beforeAll(() => {
      stubDOM()
    })

    afterAll(() => {
      vi.unstubAllGlobals()
    })

    it('renders a VElement into container', () => {
      const container = mockElem('div') as unknown as HTMLElement
      container.innerHTML = ''
      const v = h('span', { class: 'bold' }, 'content')
      render(v, container)
      expect(container.childNodes).toHaveLength(1)
      const child = container.childNodes[0] as any
      expect(child.tagName).toBe('SPAN')
      expect(child.attributes.class).toBe('bold')
    })

    it('renders text nodes', () => {
      const container = mockElem('div') as unknown as HTMLElement
      render(text('plain'), container)
      expect(container.childNodes).toHaveLength(1)
      expect(container.childNodes[0].textContent).toBe('plain')
    })

    it('renders nested elements', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const v = h('ul', null, h('li', null, 'a'), h('li', null, 'b'))
      render(v, container)
      const ul = container.childNodes[0] as any
      expect(ul.tagName).toBe('UL')
      expect(ul.childNodes).toHaveLength(2)
      expect(ul.childNodes[0].childNodes[0].textContent).toBe('a')
    })


    it('renders component', () => {
      const Comp: Component = (props) => h('div', null, String(props.label))
      const container = mockElem('div') as unknown as HTMLElement
      render(createComponent(Comp, { label: 'cmp' }), container)
      expect(container.childNodes[0].childNodes[0].textContent).toBe('cmp')
    })

    it('renders async component with comment placeholder', () => {
      const AsyncComp: Component = () => Promise.resolve(h('div', null, 'loaded'))
      const container = mockElem('div') as unknown as HTMLElement
      render(createComponent(AsyncComp), container)
      expect(container.childNodes[0].nodeType).toBe(8)
    })

    it('handles empty container', () => {
      const container = mockElem('div') as unknown as HTMLElement
      render(text(''), container)
      expect(container.childNodes).toHaveLength(1)
    })
  })

  describe('patch() (DOM-dependent)', () => {
    beforeAll(() => {
      stubDOM()
    })

    afterAll(() => {
      vi.unstubAllGlobals()
    })

    it('patches text content when text VNode changes', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const oldV = text('old')
      const newV = text('new')
      render(oldV, container)
      const dom = container.childNodes[0] as any
      patch(dom as unknown as HTMLElement, oldV as VNode, newV as VNode)
      expect(dom.textContent).toBe('new')
    })

    it('replaces element when tag changes', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const oldV = h('span')
      const newV = h('div')
      render(oldV, container)
      const dom = container.childNodes[0] as any
      dom.parentNode = container
      patch(dom as unknown as HTMLElement, oldV as VNode, newV as VNode)
      expect(container.childNodes[0].tagName).toBe('DIV')
    })

    it('patches props on same element type', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const oldV = h('div', { class: 'old', id: 'x' })
      const newV = h('div', { class: 'new' })
      render(oldV, container)
      const dom = container.childNodes[0] as any
      dom.parentNode = container
      patch(dom as unknown as HTMLElement, oldV as VNode, newV as VNode)
      expect(dom.attributes.class).toBe('new')
      expect(dom.attributes.id).toBeUndefined()
    })

    it('patches children', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const oldV = h('ul', null, h('li', null, 'a'))
      const newV = h('ul', null, h('li', null, 'b'))
      render(oldV, container)
      const ul = container.childNodes[0] as any
      ul.parentNode = container
      patch(ul as unknown as HTMLElement, oldV as VNode, newV as VNode)
      expect(ul.childNodes[0].childNodes[0].textContent).toBe('b')
    })

    it('adds new children', () => {
      const container = mockElem('div') as unknown as HTMLElement
      const oldV = h('ul', null, h('li', null, 'a'))
      const newV = h('ul', null, h('li', null, 'a'), h('li', null, 'b'))
      render(oldV, container)
      const ul = container.childNodes[0] as any
      ul.parentNode = container
      patch(ul as unknown as HTMLElement, oldV as VNode, newV as VNode)
      expect(ul.childNodes).toHaveLength(2)
    })

    it('throws when dom is null', () => {
      const oldV = h('div')
      const newV = h('span')
      expect(() => patch(null as unknown as HTMLElement, oldV as VNode, newV as VNode)).toThrow()
    })
  })
})

// ═══════════════════════════════════════════════════════════
//  3.  CLIENT ROUTER
// ═══════════════════════════════════════════════════════════

describe('ClientRouter', () => {
  let mockLocation: { pathname: string; search: string; hash: string; href: string }
  let popstateHandlers: Array<() => void>
  let mockHistory: ReturnType<typeof createMockHistory>
  let mockWindow: ReturnType<typeof createMockWindow>

  const Home: Component = () => h('div', 'home')
  const About: Component = () => h('div', 'about')
  const User: Component = () => h('div', 'user')
  const NotFound: Component = () => h('div', '404')

  beforeEach(() => {
    mockWindow = createMockWindow()
    mockLocation = mockWindow.location as typeof mockLocation
    popstateHandlers = mockWindow._popstateHandlers
    mockHistory = createMockHistory()

    vi.stubGlobal('window', mockWindow as unknown as Window & typeof globalThis)
    vi.stubGlobal('history', mockHistory as unknown as History)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('constructor', () => {
    it('creates a router with routes', () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
      ])
      expect(router).toBeInstanceOf(ClientRouter)
      expect(router.current).toBeDefined()
      expect(router.params).toBeDefined()
      expect(router.query).toBeDefined()
    })

    it('resolves initial route from current path', () => {
      mockLocation.pathname = '/about'
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/about', component: About },
      ])
      expect(router.current.value?.path).toBe('/about')
      expect(router.current.value?.component).toBe(About)
    })

    it('sets current to null when no route matches', () => {
      mockLocation.pathname = '/unknown'
      const router = new ClientRouter([
        { path: '/', component: Home },
      ])
      expect(router.current.value).toBeNull()
    })

    it('sets params and query signals', () => {
      mockLocation.pathname = '/'
      mockLocation.search = '?foo=bar'
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.params.value).toEqual({})
      expect(router.query.value).toEqual({ foo: 'bar' })
    })

    it('registers popstate listener on window', () => {
      new ClientRouter([{ path: '/', component: Home }])
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('popstate', expect.any(Function))
    })

    it('accepts basePath option', () => {
      mockLocation.pathname = '/app/users'
      const router = new ClientRouter(
        [{ path: '/users', component: Home }],
        { basePath: '/app' },
      )
      expect(router.current.value?.path).toBe('/users')
    })

    it('accepts hash mode option', () => {
      mockLocation.hash = '#/about'
      const router = new ClientRouter(
        [{ path: '/about', component: About }],
        { mode: 'hash' },
      )
      expect(router.current.value?.path).toBe('/about')
    })
  })

  describe('navigate()', () => {
    it('updates current route on navigation', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/about', component: About },
      ])
      await router.navigate('/about')
      expect(router.current.value?.path).toBe('/about')
      expect(router.current.value?.component).toBe(About)
    })

    it('calls history.pushState in history mode', async () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      await router.navigate('/about')
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/about')
    })

    it('sets window.location.hash in hash mode', async () => {
      const router = new ClientRouter(
        [{ path: '/', component: Home }],
        { mode: 'hash' },
      )
      await router.navigate('/about')
      expect(mockLocation.hash).toBe('/about')
    })

    it('prepends basePath to history.pushState', async () => {
      const router = new ClientRouter(
        [{ path: '/', component: Home }],
        { basePath: '/app' },
      )
      await router.navigate('/users')
      expect(mockHistory.pushState).toHaveBeenCalledWith(null, '', '/app/users')
    })

    it('resolves params for dynamic routes', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/users/:id', component: User },
      ])
      await router.navigate('/users/42')
      expect(router.current.value?.params).toEqual({ id: '42' })
      expect(router.params.value).toEqual({ id: '42' })
    })

    it('resolves multiple params', async () => {
      const router = new ClientRouter([
        { path: '/posts/:postId/comments/:commentId', component: Home },
      ])
      await router.navigate('/posts/123/comments/456')
      expect(router.params.value).toEqual({ postId: '123', commentId: '456' })
    })

    it('decodes URI-encoded params', async () => {
      const router = new ClientRouter([
        { path: '/users/:name', component: Home },
      ])
      await router.navigate('/users/John%20Doe')
      expect(router.params.value).toEqual({ name: 'John Doe' })
    })

    it('sets current to null on unmatched route', async () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      await router.navigate('/nonexistent')
      expect(router.current.value).toBeNull()
    })

    it('does not crash on navigate to same route', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/same', component: Home },
      ])
      await router.navigate('/same')
      await router.navigate('/same')
      expect(router.current.value?.path).toBe('/same')
    })
  })

  describe('route guards', () => {
    it('allows navigation when guard returns true', async () => {
      const guard = vi.fn(() => true)
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/admin', component: Home, guards: [guard] },
      ])
      await router.navigate('/admin')
      expect(guard).toHaveBeenCalledWith('/admin', '/')
      expect(router.current.value?.path).toBe('/admin')
    })

    it('blocks navigation when guard returns false', async () => {
      const guard = vi.fn(() => false)
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/admin', component: Home, guards: [guard as RouteGuard] },
      ])
      await expect(router.navigate('/admin')).rejects.toThrow('Navigation guard blocked')
    })

    it('blocks navigation when guard returns a rejected promise', async () => {
      const guard = vi.fn(() => Promise.resolve(false))
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/secret', component: Home, guards: [guard] },
      ])
      await expect(router.navigate('/secret')).rejects.toThrow('Navigation guard blocked')
    })

    it('runs multiple guards in sequence', async () => {
      const g1 = vi.fn(() => true)
      const g2 = vi.fn(() => true)
      const router = new ClientRouter([
        { path: '/multi', component: Home, guards: [g1, g2] },
      ])
      await router.navigate('/multi')
      expect(g1).toHaveBeenCalled()
      expect(g2).toHaveBeenCalled()
    })

    it('stops on first guard that returns false', async () => {
      const g1 = vi.fn(() => false)
      const g2 = vi.fn(() => true)
      const router = new ClientRouter([
        { path: '/multi', component: Home, guards: [g1, g2] },
      ])
      await expect(router.navigate('/multi')).rejects.toThrow()
      expect(g2).not.toHaveBeenCalled()
    })
  })

  describe('match()', () => {
    it('matches static routes', () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/about', component: About },
      ])
      expect(router.current.value?.path).toBe('/')
    })

    it('matches dynamic routes with :param', () => {
      mockLocation.pathname = '/users/42'
      const router = new ClientRouter([
        { path: '/users/:id', component: User },
      ])
      expect(router.current.value?.params).toEqual({ id: '42' })
    })

    it('returns null when no route matches', () => {
      mockLocation.pathname = '/noroute'
      const router = new ClientRouter([
        { path: '/', component: Home },
      ])
      expect(router.current.value).toBeNull()
    })

    it('matches routes with multiple path segments', () => {
      mockLocation.pathname = '/a/b/c'
      const router = new ClientRouter([
        { path: '/a/b/c', component: Home },
      ])
      expect(router.current.value).not.toBeNull()
    })
  })

  describe('back() / forward()', () => {
    it('back() decrements history index and calls history.back()', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/a', component: Home },
        { path: '/b', component: Home },
      ])
      await router.navigate('/a')
      await router.navigate('/b')
      expect(router['_historyIndex'] as unknown).toBe(1)
      router.back()
      expect(mockHistory.back).toHaveBeenCalled()
    })

    it('back() does not navigate at start', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      router.back()
      expect(mockHistory.back).not.toHaveBeenCalled()
    })

    it('forward() increments history index and calls history.forward()', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/a', component: Home },
      ])
      await router.navigate('/a')
      await router.navigate('/b')
      router.back()
      expect(router['_historyIndex'] as unknown).toBe(0)
      router.forward()
      expect(mockHistory.forward).toHaveBeenCalled()
    })

    it('forward() does not navigate at end', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      router.forward()
      expect(mockHistory.forward).not.toHaveBeenCalled()
    })

    it('trims forward history on new navigation', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/a', component: Home },
        { path: '/b', component: Home },
      ])
      await router.navigate('/a')
      await router.navigate('/b')
      router.back()
      await router.navigate('/c')
      expect(router['_historyIndex'] as unknown).toBe(1)
      expect(router['_history'] as unknown).toEqual(['/a', '/c'])
    })
  })

  describe('popstate event', () => {
    it('updates current route on popstate', () => {
      mockLocation.pathname = '/about'
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/about', component: About },
      ])
      expect(router.current.value?.path).toBe('/about')
      mockLocation.pathname = '/'
      mockWindow._triggerPopstate()
      expect(router.current.value?.path).toBe('/')
    })

    it('updates query on popstate', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      mockLocation.search = '?key=val'
      mockWindow._triggerPopstate()
      expect(router.query.value).toEqual({ key: 'val' })
    })
  })

  describe('link()', () => {
    it('returns an anchor VElement', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      const link = router.link({ to: '/about', children: 'About' }) as VElement
      expect(link.type).toBe('element')
      expect(link.tag).toBe('a')
    })

    it('sets href prop', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      const link = router.link({ to: '/about', children: 'About' })
      expect((link as VElement).props.href).toBe('/about')
    })

    it('prepends basePath to href', () => {
      const router = new ClientRouter(
        [{ path: '/', component: Home }],
        { basePath: '/app' },
      )
      const link = router.link({ to: '/users', children: 'Users' })
      expect((link as VElement).props.href).toBe('/app/users')
    })

    it('sets class as Computed', () => {
      const Comp: Component = () => h('div')
      const router = new ClientRouter([
        { path: '/', component: Comp },
      ])
      const link = router.link({ to: '/about', children: 'About', class: 'nav-link' })
      const cls = (link as VElement).props.class
      expect(cls).toBeInstanceOf(Computed)
      expect(cls.value).toContain('nav-link')
    })

    it('adds activeClass when current route matches to', async () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/active', component: Home },
      ])
      await router.navigate('/active')
      const link = router.link({ to: '/active', children: 'Active', activeClass: 'is-active' })
      const cls = (link as VElement).props.class
      expect(cls.value).toContain('is-active')
    })

    it('does not add activeClass when route does not match', () => {
      const router = new ClientRouter([
        { path: '/', component: Home },
        { path: '/other', component: Home },
      ])
      const link = router.link({ to: '/other', children: 'Other', activeClass: 'is-active' })
      const cls = (link as VElement).props.class
      expect(cls.value).not.toContain('is-active')
    })

    it('renders text children', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      const link = router.link({ to: '/test', children: 'Click' })
      const textChild = (link as VElement).children[0] as VText
      expect(textChild).toBeDefined()
    })
  })

  describe('query parameter parsing', () => {
    it('parses query string on construction', () => {
      mockLocation.search = '?a=1&b=hello&c'
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.query.value).toEqual({ a: '1', b: 'hello', c: '' })
    })

    it('handles empty query string', () => {
      mockLocation.search = ''
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.query.value).toEqual({})
    })

    it('decodes query parameters', () => {
      mockLocation.search = '?q=hello%20world&lang=en%23us'
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.query.value).toEqual({ q: 'hello world', lang: 'en#us' })
    })
  })

  describe('current route state', () => {
    it('provides current route as signal', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.current.value?.component).toBe(Home)
      expect(router.current.value?.pattern).toBe('/')
    })

    it('current is a Signal instance', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.current).toBeInstanceOf(Signal)
    })

    it('params is a Signal instance', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.params).toBeInstanceOf(Signal)
    })

    it('query is a Signal instance', () => {
      const router = new ClientRouter([{ path: '/', component: Home }])
      expect(router.query).toBeInstanceOf(Signal)
    })
  })

  describe('edge cases', () => {
    it('handles routes with trailing slashes', () => {
      mockLocation.pathname = '/users/'
      const router = new ClientRouter([
        { path: '/users', component: Home },
      ])
      expect(router.current.value).not.toBeNull()
      expect(router.current.value?.pattern).toBe('/users')
    })

    it('handles route with layout', () => {
      const Layout: Component = (props) => h('div', { class: 'layout' }, props.children as VNode)
      const router = new ClientRouter([
        { path: '/', component: Home, layout: Layout },
      ])
      expect(router.current.value?.layout).toBe(Layout)
    })

    it('handles route with loading component', () => {
      const Loader: Component = () => h('div', 'loading...')
      const router = new ClientRouter([
        { path: '/', component: Home, loading: Loader },
      ])
      expect(router.current.value?.loading).toBe(Loader)
    })

    it('handles route with error component', () => {
      const Err: Component = () => h('div', 'error!')
      const router = new ClientRouter([
        { path: '/', component: Home, error: Err },
      ])
      expect(router.current.value?.error).toBe(Err)
    })

    it('resolves route with empty basePath', () => {
      const router = new ClientRouter(
        [{ path: '/', component: Home }],
        { basePath: '' },
      )
      expect(router.current.value?.path).toBe('/')
    })
  })
})
