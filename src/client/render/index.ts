import type { VNode, Component } from '../vdom/index.js'
import { renderToString, renderToStream } from '../vdom/index.js'
import { resolve, normalize } from 'node:path'

export class ServerRenderer {
  private baseDir: string

  constructor(baseDir?: string) {
    this.baseDir = baseDir ? normalize(resolve(baseDir)) : ''
  }

  /**
   * Validates that a resolved file path stays within the configured base directory.
   * If baseDir is empty (not configured), validation is skipped for backward compatibility.
   */
  private assertPathInBaseDir(resolved: string): void {
    if (!this.baseDir) return
    const normalized = normalize(resolved)
    if (!normalized.startsWith(this.baseDir)) {
      console.error(`[Security] Path traversal attempt blocked: "${normalized}" is outside allowed baseDir "${this.baseDir}"`)
      throw new Error(`SecurityError: Path traversal detected — "${resolved}" is not within the allowed base directory`)
    }
  }

  render(component: Component, props?: any): Promise<string> {
    const vnode: VNode = {
      type: 'component',
      component,
      props: props || {},
    }
    return Promise.resolve(renderToString(vnode))
  }

  renderToStream(component: Component, props?: any): ReadableStream<string> {
    const vnode: VNode = {
      type: 'component',
      component,
      props: props || {},
    }
    return renderToStream(vnode)
  }

  renderStatic(component: Component, props?: any): string {
    const vnode: VNode = {
      type: 'component',
      component,
      props: props || {},
    }
    return renderToString(vnode)
  }

  async renderServerComponent(path: string, props?: any): Promise<string> {
    const resolvedPath = this.baseDir ? resolve(this.baseDir, path) : resolve(path)
    this.assertPathInBaseDir(resolvedPath)

    const mod = await import(resolvedPath)
    const compKey = Object.keys(mod).find((k) => typeof mod[k] === 'function')
    if (!compKey) throw new Error(`No component export found in ${path}`)
    const component = mod[compKey] as Component
    const result = component(props || {})
    const resolved = result instanceof Promise ? await result : result
    return renderToString(resolved)
  }
}

export function generateHydrationScript(): string {
  return '<script>(function(){var d=document.createElement("div");d.setAttribute("data-speexjs-hydrated","");document.body.appendChild(d)})();</script>'
}
