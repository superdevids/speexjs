import { Signal, Computed } from '../signals/index.js'
import type { signal, computed, effect } from '../signals/index.js'

export type VNode = VElement | VText | VFragment | VComponent | VSignalNode

export interface VElement {
  type: 'element'
  tag: string
  props: Record<string, any>
  children: VNode[]
  key?: string
}

export interface VText {
  type: 'text'
  text: string
}

export interface VFragment {
  type: 'fragment'
  children: VNode[]
}

export interface VComponent {
  type: 'component'
  component: Component
  props: Record<string, any>
  children?: VNode[]
}

export interface VSignalNode {
  type: 'signal'
  signal: Signal<VNode>
}

export interface Component {
  (props: Record<string, any>, context?: ComponentContext): VNode | Promise<VNode>
}

export interface ComponentContext {
  signal: typeof signal
  computed: typeof computed
  effect: typeof effect
  props: Record<string, any>
  children?: VNode[]
}

const nodeCleanups = new WeakMap<Node, () => void>()

const VOID_ELEMENTS = new Set([
  'area','base','br','col','embed','hr','img','input','link','meta',
  'param','source','track','wbr',
])

const SVG_ELEMENTS = new Set([
  'svg','path','circle','rect','g','text','line','polyline','polygon',
  'ellipse','use','defs','clipPath','mask','linearGradient','radialGradient',
  'stop','tspan','textPath','image','foreignObject','marker','pattern',
  'symbol','filter','feBlend','feColorMatrix','feComponentTransfer',
  'feComposite','feDropShadow','feFlood','feGaussianBlur','feMerge',
  'feOffset','feImage','feTile','feTurbulence',
])

function isSignal(val: unknown): val is Signal<any> {
  return val instanceof Signal
}

function isComputed(val: unknown): val is Computed<any> {
  return val instanceof Computed
}

export function normalizeChild(child: any): VNode | null {
  if (child == null || typeof child === 'boolean') return null
  if (isSignal(child) || isComputed(child)) {
    return { type: 'signal', signal: child as unknown as Signal<VNode> }
  }
  if (typeof child === 'string' || typeof child === 'number') {
    return { type: 'text', text: String(child) }
  }
  if (Array.isArray(child)) {
    const children = child.flat(Infinity).map(normalizeChild).filter(Boolean) as VNode[]
    if (children.length === 0) return null
    if (children.length === 1) return children[0] as VNode
    return { type: 'fragment', children }
  }
  if (typeof child === 'object' && child !== null && 'type' in child) {
    return child as VNode
  }
  if (typeof child === 'function') {
    return { type: 'component', component: child as Component, props: {} }
  }
  return { type: 'text', text: String(child) }
}

export function h(tag: string | Component, props?: any, ...children: any[]): VNode {
  if (typeof tag === 'function') {
    const c = children.flat(Infinity).map(normalizeChild).filter(Boolean) as VNode[]
    return {
      type: 'component',
      component: tag as Component,
      props: { ...(props || {}), children: c.length > 0 ? c : undefined },
    }
  }
  return {
    type: 'element',
    tag,
    props: props || {},
    children: children.flat(Infinity).map(normalizeChild).filter(Boolean) as VNode[],
    key: props?.key,
  }
}

export function fragment(...children: any[]): VNode {
  const flat = children.flat(Infinity)
  const normalized = flat.map(normalizeChild).filter(Boolean) as VNode[]
  if (normalized.length === 0) return { type: 'text', text: '' }
  if (normalized.length === 1) return normalized[0]!
  return { type: 'fragment', children: normalized }
}

export function text(content: string): VText {
  return { type: 'text', text: content }
}

export function createComponent(type: Component, props?: any, ...children: any[]): VComponent {
  const c = children.flat(Infinity).map(normalizeChild).filter(Boolean) as VNode[]
  return {
    type: 'component',
    component: type,
    props: { ...(props || {}), children: c.length > 0 ? c : undefined },
  }
}

function setProp(el: Element, key: string, value: any, oldValue?: any): void {
  if (key === 'key' || key === 'children' || key === 'ref') return
  if (isComputed(value)) {
    setProp(el, key, value.peek(), oldValue)
    value.subscribe((v: any) => setProp(el, key, v))
    return
  }
  if (key.startsWith('on') && typeof value === 'function') {
    const event = key.slice(2).toLowerCase()
    if (oldValue) el.removeEventListener(event, oldValue)
    el.addEventListener(event, value)
    return
  }
  if (key === 'style') {
    if (typeof value === 'string') {
      el.setAttribute('style', value)
    } else if (typeof value === 'object' && value !== null) {
      Object.assign((el as HTMLElement).style, value)
    }
    return
  }
  if (key === 'class' || key === 'className') {
    if (typeof value === 'string') {
      el.setAttribute('class', value)
    } else if (Array.isArray(value)) {
      el.setAttribute('class', value.filter(Boolean).join(' '))
    }
    return
  }
  if (key === 'dangerouslySetInnerHTML' && typeof value === 'object' && value?.__html) {
    el.innerHTML = value.__html
    return
  }
  if (key === 'value' || key === 'checked' || key === 'disabled' || key === 'selected') {
    (el as any)[key] = value
    return
  }
  if (key === 'htmlFor') {
    el.setAttribute('for', value)
    return
  }
  if (value === false || value === null || value === undefined) {
    el.removeAttribute(key)
  } else if (value === true) {
    el.setAttribute(key, '')
  } else {
    el.setAttribute(key, String(value))
  }
}

function removeProp(el: Element, key: string, value: any): void {
  if (key === 'key' || key === 'children' || key === 'ref') return
  if (key.startsWith('on') && typeof value === 'function') {
    el.removeEventListener(key.slice(2).toLowerCase(), value)
    return
  }
  if (key === 'style') { el.removeAttribute('style'); return }
  if (key === 'class' || key === 'className') { el.removeAttribute('class'); return }
  if (key === 'value' || key === 'checked' || key === 'disabled') { delete (el as any)[key]; return }
  el.removeAttribute(key)
}

function createDOM(vnode: VNode): Node {
  switch (vnode.type) {
    case 'element': {
      const isSVG = SVG_ELEMENTS.has(vnode.tag)
      const el = isSVG
        ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
        : document.createElement(vnode.tag)
      for (const [key, value] of Object.entries(vnode.props)) {
        if (key !== 'key') setProp(el, key, value)
      }
      for (const child of vnode.children) {
        el.appendChild(createDOM(child))
      }
      return el
    }
    case 'text':
      return document.createTextNode(vnode.text)
    case 'fragment': {
      const frag = document.createDocumentFragment()
      for (const child of vnode.children) frag.appendChild(createDOM(child))
      return frag
    }
    case 'component': {
      const result = vnode.component(vnode.props)
      if (result instanceof Promise) {
        const placeholder = document.createComment(' async ')
        result.then((resolved) => {
          const node = createDOM(resolved)
          placeholder.parentNode?.replaceChild(node, placeholder)
        }).catch(() => { /* async component failed - keep placeholder */ })
        return placeholder
      }
      return createDOM(result)
    }
    case 'signal': {
      const val = vnode.signal.value
      const v = normalizeChild(val)
      const node = createDOM(v ?? text(''))
      const unsub = vnode.signal.subscribe((newVal: any) => {
        const newV = normalizeChild(newVal)
        if (newV && node.parentNode) {
          const newNode = createDOM(newV)
          node.parentNode.replaceChild(newNode, node)
        }
      })
      nodeCleanups.set(node, unsub)
      return node
    }
  }
}

export function render(vnode: VNode, container: HTMLElement): void {
  container.innerHTML = ''
  container.appendChild(createDOM(vnode))
}

function isSameVNodeType(a: VNode, b: VNode): boolean {
  if (a.type !== b.type) return false
  if (a.type === 'element' && b.type === 'element') {
    return a.tag === b.tag && a.key === b.key
  }
  return true
}

function patchProps(el: Element, oldProps: Record<string, any>, newProps: Record<string, any>): void {
  const allKeys = new Set([...Object.keys(oldProps), ...Object.keys(newProps)])
  for (const key of allKeys) {
    if (key === 'key' || key === 'children') continue
    const oldVal = oldProps[key]
    const newVal = newProps[key]
    if (oldVal === newVal) continue
    if (newVal === undefined || newVal === null) {
      removeProp(el, key, oldVal)
    } else {
      setProp(el, key, newVal, oldVal)
    }
  }
}

function getVNodeKey(vn: VNode | undefined, index: number): string | number {
  return (vn != null && 'key' in vn && (vn as any).key != null) ? (vn as any).key : index
}

function patchChildren(parent: Node, oldChildren: VNode[], newChildren: VNode[]): void {
  const oldMap = new Map<string | number, { node: Node; vnode: VNode }>()
  for (let i = 0; i < oldChildren.length; i++) {
    const key = getVNodeKey(oldChildren[i], i)
    if (i < parent.childNodes.length) {
      oldMap.set(key, { node: parent.childNodes[i]!, vnode: oldChildren[i]! })
    }
  }

  const maxLen = Math.max(oldChildren.length, newChildren.length)
  for (let i = 0; i < maxLen; i++) {
    const newChild = newChildren[i]
    const newKey = getVNodeKey(newChild, i)
    const matched = oldMap.get(newKey)

    if (matched && newChild && isSameVNodeType(matched.vnode, newChild)) {
      patchVNode(matched.node, matched.vnode, newChild)
      oldMap.delete(newKey)
    } else if (matched && newChild) {
      const newNode = createDOM(newChild)
      parent.replaceChild(newNode, matched.node)
      oldMap.delete(newKey)
    } else if (newChild) {
      parent.appendChild(createDOM(newChild))
    }
  }

  for (const [, leftover] of oldMap) {
    if (leftover.node.parentNode === parent) {
      nodeCleanups.get(leftover.node)?.()
      parent.removeChild(leftover.node)
    }
  }
}

function patchVNode(dom: Node | null, oldVNode: VNode, newVNode: VNode): void {
  if (!dom) return
  if (oldVNode.type === 'element' && newVNode.type === 'element') {
    patchProps(dom as HTMLElement, oldVNode.props, newVNode.props)
    patchChildren(dom, oldVNode.children, newVNode.children)
  } else if (oldVNode.type === 'text' && newVNode.type === 'text') {
    if (oldVNode.text !== newVNode.text) {
      (dom as Text).textContent = newVNode.text
    }
  } else if (oldVNode.type === 'fragment' && newVNode.type === 'fragment') {
    patchChildren(dom.parentNode || dom, oldVNode.children, newVNode.children)
  }
}

export function patch(dom: HTMLElement, oldVNode: VNode, newVNode: VNode): void {
  if (isSameVNodeType(oldVNode, newVNode)) {
    patchVNode(dom, oldVNode, newVNode)
  } else {
    const parent = dom.parentNode
    if (parent) {
      parent.replaceChild(createDOM(newVNode), dom)
    }
  }
}

export function hydrate(vnode: VNode, container: HTMLElement): void {
  function hydrateNode(vn: VNode, node: Node): void {
    if (vn.type === 'element') {
      const el = node as HTMLElement
      for (const [key, value] of Object.entries(vn.props)) {
        if (key.startsWith('on') && typeof value === 'function') {
          el.addEventListener(key.slice(2).toLowerCase(), value)
        }
      }
      for (let i = 0; i < Math.min(vn.children.length, el.childNodes.length); i++) {
        hydrateNode(vn.children[i]!, el.childNodes[i]!)
      }
    } else if (vn.type === 'component') {
      const result = vn.component(vn.props)
      if (!(result instanceof Promise)) hydrateNode(result, node)
    } else if (vn.type === 'signal') {
      vn.signal.subscribe((newVal: any) => {
        const newChild = normalizeChild(newVal)
        if (newChild && node.parentNode) {
          node.parentNode.replaceChild(createDOM(newChild), node)
        }
      })
    }
  }
  if (container.firstChild) {
    hydrateNode(vnode, container.firstChild)
  } else {
    render(vnode, container)
  }
}

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (c) => ESCAPE_MAP[c] || c)
}

function renderProps(props: Record<string, any>): string {
  let out = ''
  for (const [key, value] of Object.entries(props)) {
    if (key === 'key' || key === 'children' || key === 'ref') continue
    if (key.startsWith('on')) continue
    if (value === false || value === null || value === undefined) continue
    if (key === 'style' && typeof value === 'object') {
      const styleStr = Object.entries(value)
        .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`)
        .join(';')
      out += ' style="' + escapeHtml(styleStr) + '"'
      continue
    }
    if (key === 'class' || key === 'className') {
      const cls = Array.isArray(value) ? value.filter(Boolean).join(' ') : value
      out += ' class="' + escapeHtml(String(cls)) + '"'
      continue
    }
    if (key === 'htmlFor') { out += ' for="' + escapeHtml(String(value)) + '"'; continue }
    if (value === true) { out += ' ' + key }
    else { out += ' ' + key + '="' + escapeHtml(String(value)) + '"' }
  }
  return out
}

function renderVNodeToString(vnode: VNode): string {
  switch (vnode.type) {
    case 'element': {
      const children = vnode.children.map(renderVNodeToString).join('')
      if (VOID_ELEMENTS.has(vnode.tag)) return '<' + vnode.tag + renderProps(vnode.props) + '>'
      return '<' + vnode.tag + renderProps(vnode.props) + '>' + children + '</' + vnode.tag + '>'
    }
    case 'text': return escapeHtml(vnode.text)
    case 'fragment': return vnode.children.map(renderVNodeToString).join('')
    case 'component': {
      const result = vnode.component(vnode.props)
      if (result instanceof Promise) throw new Error('Async components must use renderToStream or ServerRenderer')
      return renderVNodeToString(result)
    }
    case 'signal': return renderVNodeToString(normalizeChild(vnode.signal.value) ?? text(''))
  }
}

export function renderToString(vnode: VNode): string {
  return renderVNodeToString(vnode)
}

export function renderToStream(vnode: VNode): ReadableStream<string> {
  return new ReadableStream({
    start(controller) {
      const html = renderToString(vnode)
      controller.enqueue(html)
      controller.close()
    },
  })
}
