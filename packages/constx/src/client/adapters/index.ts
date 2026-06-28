export interface FrameworkAdapter {
  name: string
  render(component: any, container: HTMLElement): void
  hydrate(component: any, container: HTMLElement): void
  renderToString(component: any): string
}

export function defineAdapter(adapter: FrameworkAdapter): FrameworkAdapter {
  return adapter
}
