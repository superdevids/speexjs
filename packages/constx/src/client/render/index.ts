import type { VNode, Component } from '../vdom/index.js'
import { renderToString, renderToStream } from '../vdom/index.js'

export class ServerRenderer {
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
    const mod = await import(path)
    const compKey = Object.keys(mod).find((k) => typeof mod[k] === 'function')
    if (!compKey) throw new Error(`No component export found in ${path}`)
    const component = mod[compKey] as Component
    const result = component(props || {})
    const resolved = result instanceof Promise ? await result : result
    return renderToString(resolved)
  }
}

export function generateHydrationScript(): string {
  return '<script>(function(){var d=document.createElement("div");d.setAttribute("data-constx-hydrated","");document.body.appendChild(d)})();</script>'
}
