type FeatureResolver = (user?: { id: string }) => boolean | Promise<boolean>

export class FeatureFlags {
  private flags = new Map<string, { enabled: boolean; resolver?: FeatureResolver }>()

  define(name: string, enabled = false): void {
    this.flags.set(name, { enabled })
  }

  defineWithResolver(name: string, resolver: FeatureResolver): void {
    this.flags.set(name, { enabled: false, resolver })
  }

  is(name: string, user?: { id: string }): boolean {
    const flag = this.flags.get(name)
    if (!flag) return false
    if (flag.resolver) return flag.resolver(user) as boolean
    return flag.enabled
  }

  enable(name: string): void {
    const f = this.flags.get(name)
    if (f) f.enabled = true
  }

  disable(name: string): void {
    const f = this.flags.get(name)
    if (f) f.enabled = false
  }

  all(): string[] {
    return [...this.flags.keys()]
  }

  /** Percentage rollout: 0.0 to 1.0 */
  percentage(name: string, percent: number): boolean {
    if (!this.flags.has(name)) return false
    return Math.random() < percent
  }
}
