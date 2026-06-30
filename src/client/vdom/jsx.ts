import type { VNode, VElement, VText, VFragment, VComponent, Component } from './index.js'

const emptyText = (): VText => ({ type: 'text' as const, text: '' })

export function createElement(tag: any, props: any, ...children: any[]): VNode {
  const { isSVG, ...rest } = props || {}
  if (typeof tag === 'function') {
    const childArr = children.flat(Infinity)
    const result: VComponent = {
      type: 'component' as const,
      component: tag as Component,
      props: { ...rest, children: childArr.length > 0 ? childArr : undefined },
    }
    return result
  }
  const childNodes: VNode[] = children.flat(Infinity).map((c: any): VNode => {
    if (c == null || typeof c === 'boolean') return emptyText()
    if (typeof c === 'object' && c !== null && 'type' in c) return c as VNode
    return { type: 'text' as const, text: String(c) }
  })
  const result: VElement = {
    type: 'element' as const,
    tag: tag as string,
    props: rest || {},
    children: childNodes,
  }
  return result
}

export function Fragment(props: { children?: any }): VNode {
  const children = props?.children
  if (!children) return emptyText()
  const arr = Array.isArray(children) ? children : [children]
  const flat = arr.flat(Infinity).map((c: any): VNode => {
    if (c == null || typeof c === 'boolean') return emptyText()
    if (typeof c === 'object' && c !== null && 'type' in c) return c as VNode
    return { type: 'text' as const, text: String(c) }
  })
  if (flat.length === 1) return flat[0]!
  const result: VFragment = { type: 'fragment' as const, children: flat }
  return result
}
