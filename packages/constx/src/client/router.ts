import { signal, computed, Signal } from './signals/index.js'
import type { VNode, Component } from './vdom/index.js'

export interface RouteDefinition {
  path: string
  component: Component
  layout?: Component
  loading?: Component
  error?: Component
  guards?: RouteGuard[]
}

export type RouteGuard = (to: string, from: string) => boolean | Promise<boolean>

export interface RouterOptions {
  basePath?: string
  mode?: 'history' | 'hash'
  scrollRestoration?: boolean
}

interface RouteMatch {
  path: string
  pattern: string
  component: Component
  layout?: Component
  loading?: Component
  error?: Component
  params: Record<string, string>
  query: Record<string, string>
}

function parseQuery(search: string): Record<string, string> {
  const params: Record<string, string> = {}
  const qs = search.startsWith('?') ? search.slice(1) : search
  if (!qs) return params
  for (const part of qs.split('&')) {
    const [key, val] = part.split('=')
    if (key) params[decodeURIComponent(key)] = val ? decodeURIComponent(val) : ''
  }
  return params
}

function matchPath(routePath: string, urlPath: string): Record<string, string> | null {
  const routeParts = routePath.split('/')
  const urlParts = urlPath.split('/')
  if (routeParts.length !== urlParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < routeParts.length; i++) {
    const rp = routeParts[i]!
    const up = urlParts[i]!
    if (rp.startsWith(':')) {
      params[rp.slice(1)] = decodeURIComponent(up)
    } else if (rp !== up) {
      return null
    }
  }
  return params
}

export class ClientRouter {
  private _current: Signal<RouteMatch | null>
  private _params: Signal<Record<string, string>>
  private _query: Signal<Record<string, string>>
  private _history: string[] = []
  private _historyIndex = -1
  private _routes: RouteDefinition[]
  private _options: Required<RouterOptions>

  constructor(routes: RouteDefinition[], options?: RouterOptions) {
    this._routes = routes
    this._options = {
      basePath: options?.basePath ?? '',
      mode: options?.mode ?? 'history',
      scrollRestoration: options?.scrollRestoration ?? true,
    }

    const initialMatch = this._resolveRoute(this._getCurrentPath())
    this._current = signal<RouteMatch | null>(initialMatch)
    this._params = signal<Record<string, string>>(initialMatch?.params ?? {})
    this._query = signal<Record<string, string>>(parseQuery(window.location.search))

    if (this._options.scrollRestoration) {
      history.scrollRestoration = 'auto'
    }

    window.addEventListener('popstate', () => {
      const path = this._getCurrentPath()
      const match = this._resolveRoute(path)
      this._current.value = match
      this._params.value = match?.params ?? {}
      this._query.value = parseQuery(window.location.search)
    })
  }

  get current(): Signal<RouteMatch | null> {
    return this._current
  }

  get params(): Signal<Record<string, string>> {
    return this._params
  }

  get query(): Signal<Record<string, string>> {
    return this._query
  }

  private _getCurrentPath(): string {
    if (this._options.mode === 'hash') {
      const hash = window.location.hash.slice(1) || '/'
      return hash
    }
    let path = window.location.pathname
    if (this._options.basePath && path.startsWith(this._options.basePath)) {
      path = path.slice(this._options.basePath.length) || '/'
    }
    return path
  }

  private _resolveRoute(path: string): RouteMatch | null {
    for (const route of this._routes) {
      const params = matchPath(route.path, path)
      if (params !== null) {
        return {
          path,
          pattern: route.path,
          component: route.component,
          layout: route.layout,
          loading: route.loading,
          error: route.error,
          params,
          query: parseQuery(window.location.search),
        }
      }
    }
    return null
  }

  async navigate(path: string): Promise<void> {
    const from = this._getCurrentPath()
    const to = path

    const route = this._routes.find((r) => matchPath(r.path, to) !== null)
    if (route?.guards) {
      for (const guard of route.guards) {
        const allowed = await guard(to, from)
        if (!allowed) throw new Error(`Navigation guard blocked: ${from} -> ${to}`)
      }
    }

    const resolvedPath = this._options.basePath
      ? this._options.basePath + to
      : to

    if (this._options.mode === 'hash') {
      window.location.hash = to
    } else {
      history.pushState(null, '', resolvedPath)
    }

    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1)
    }
    this._history.push(to)
    this._historyIndex++

    const match = this._resolveRoute(to)
    this._current.value = match
    this._params.value = match?.params ?? {}
    this._query.value = parseQuery(window.location.search)
  }

  back(): void {
    if (this._historyIndex > 0) {
      this._historyIndex--
      const path = this._history[this._historyIndex]!
      if (this._options.mode === 'hash') {
        window.location.hash = path
      } else {
        history.back()
      }
    }
  }

  forward(): void {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++
      const path = this._history[this._historyIndex]!
      if (this._options.mode === 'hash') {
        window.location.hash = path
      } else {
        history.forward()
      }
    }
  }

  link(props: { to: string; children: any; class?: string; activeClass?: string; onClick?: (e: MouseEvent) => void }): VNode {
    const isActive = computed(() => {
      const current = this._current.value
      return current?.path === props.to
    })

    const handleClick = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return
      e.preventDefault()
      props.onClick?.(e)
      this.navigate(props.to)
    }

    const { children, to, activeClass, ...rest } = props
    const cls = computed(() => {
      const base = rest.class || ''
      const active = activeClass && isActive.value ? ` ${activeClass}` : ''
      return `${base}${active}`
    })

    const childNodes = (Array.isArray(children) ? children : [children]).flat(Infinity).map((c: any) => {
      if (c == null || typeof c === 'boolean') return { type: 'text', text: '' } as VNode
      if (typeof c === 'object' && 'type' in c) return c as VNode
      return { type: 'text', text: String(c) } as VNode
    })

    return {
      type: 'element',
      tag: 'a',
      props: { href: this._options.basePath + to, onClick: handleClick, class: cls },
      children: childNodes,
    }
  }
}

