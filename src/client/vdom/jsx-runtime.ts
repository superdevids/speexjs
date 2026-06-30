import type { VNode } from './index.js'
import { normalizeChild } from './index.js'
import { Fragment } from './jsx.js'

export { Fragment }

export function jsx(tag: any, props: any, key?: string): VNode {
  const { children, ...rest } = props || {}
  const childArray = children !== undefined
    ? (Array.isArray(children) ? children.flat(Infinity) : [children])
    : []
  const normalized = childArray.map(normalizeChild).filter(Boolean) as VNode[]

  if (typeof tag === 'function') {
    return {
      type: 'component',
      component: tag,
      props: { ...rest, children: normalized.length > 0 ? normalized : undefined },
    } as VNode
  }
  return {
    type: 'element',
    tag,
    props: rest,
    children: normalized,
    key,
  } as VNode
}

export function jsxs(tag: any, props: any, key?: string): VNode {
  return jsx(tag, props, key)
}

export function jsxDEV(tag: any, props: any, key?: string): VNode {
  return jsx(tag, props, key)
}
