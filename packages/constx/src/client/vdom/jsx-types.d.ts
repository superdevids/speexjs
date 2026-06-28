export namespace JSX {
  export type Element = import('./index.js').VNode
  export interface IntrinsicElements {
    [tag: string]: any
  }
  export interface ElementChildrenAttribute {
    children: any
  }
}
