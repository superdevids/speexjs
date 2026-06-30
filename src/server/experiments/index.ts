export class Experiments {
  private experiments = new Map<string, { variants: string[]; weights: number[] }>()

  define(name: string, variants: string[], weights?: number[]): void {
    this.experiments.set(name, { variants, weights: weights ?? variants.map(() => 1 / variants.length) })
  }

  assign(name: string, userId: string): string {
    const exp = this.experiments.get(name)
    if (!exp) throw new Error(`Experiment "${name}" not found`)
    const hash = [...userId].reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const idx = hash % exp.variants.length
    return exp.variants[idx]!
  }

  list(): string[] { return [...this.experiments.keys()] }
}
