import type { VNode } from '../vdom/index.js'
import { h } from '../vdom/index.js'

export interface ImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  loading?: 'lazy' | 'eager'
  className?: string
}

export function Image(props: ImageProps): VNode {
  return h('img', {
    src: props.src,
    alt: props.alt,
    width: props.width,
    height: props.height,
    loading: props.loading ?? 'lazy',
    class: props.className,
    decoding: 'async',
  })
}
