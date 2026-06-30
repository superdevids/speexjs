import { mkdir, readFile, writeFile, readdir, unlink, rm } from 'node:fs/promises'
import { join } from 'node:path'

export interface PromptConfig {
  dir: string
}

export interface PromptDefinition {
  template: string
  description: string
  variables: string[]
}

export interface PromptVariantDefinition {
  template: string
  weight: number
}

export interface PromptVersion {
  id: string
  template: string
  description: string
  variables: string[]
  createdAt: number
}

export interface PromptVariant {
  id: string
  template: string
  weight: number
  createdAt: number
  performance: PromptPerformance
}

export interface PromptPerformance {
  totalCalls: number
  successCount: number
  failureCount: number
  totalLatency: number
  totalTokens: number
  avgLatency: number
  avgTokens: number
  successRate: number
}

export interface PromptData {
  name: string
  currentVersion: string
  template: string
  description: string
  variables: string[]
  versions: PromptVersion[]
  variants: PromptVariant[]
  performance: PromptPerformance
}

export interface TrackMetrics {
  success: boolean
  latency: number
  tokens: number
  variantId?: string
}

export interface RenderResult {
  text: string
  promptName: string
  variantId: string | null
}

export interface PromptStats {
  name: string
  currentVersion: string
  description: string
  variables: string[]
  versionCount: number
  variantCount: number
  performance: PromptPerformance
}

const INDEX_FILE = '_index.json'
const META_FILE = 'meta.json'
const VERSIONS_FILE = 'versions.json'
const VARIANTS_FILE = 'variants.json'
const PERFORMANCE_FILE = 'performance.json'

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

function emptyPerformance(): PromptPerformance {
  return {
    totalCalls: 0,
    successCount: 0,
    failureCount: 0,
    totalLatency: 0,
    totalTokens: 0,
    avgLatency: 0,
    avgTokens: 0,
    successRate: 1,
  }
}

export class PromptManager {
  private baseDir: string

  constructor(config: PromptConfig) {
    this.baseDir = config.dir
  }

  private async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const raw = await readFile(filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }

  private async writeJSON(filePath: string, data: unknown): Promise<void> {
    await mkdir(filePath.split('\\').slice(0, -1).join('\\') || '.', { recursive: true })
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  private promptDir(name: string): string {
    return join(this.baseDir, name)
  }

  private metaPath(name: string): string {
    return join(this.baseDir, name, META_FILE)
  }

  private versionsPath(name: string): string {
    return join(this.baseDir, name, VERSIONS_FILE)
  }

  private variantsPath(name: string): string {
    return join(this.baseDir, name, VARIANTS_FILE)
  }

  private perfPath(name: string): string {
    return join(this.baseDir, name, PERFORMANCE_FILE)
  }

  private indexFilePath(): string {
    return join(this.baseDir, INDEX_FILE)
  }

  private async getIndex(): Promise<string[]> {
    const data = await this.readJSON<{ prompts: string[] }>(this.indexFilePath())
    return data?.prompts ?? []
  }

  private async saveIndex(names: string[]): Promise<void> {
    await this.writeJSON(this.indexFilePath(), { prompts: names.sort() })
  }

  private async addToIndex(name: string): Promise<void> {
    const index = await this.getIndex()
    if (!index.includes(name)) {
      index.push(name)
      await this.saveIndex(index)
    }
  }

  private async removeFromIndex(name: string): Promise<void> {
    const index = await this.getIndex()
    const filtered = index.filter((n) => n !== name)
    await this.saveIndex(filtered)
  }

  private versionId(): string {
    return `v${Date.now()}`
  }

  async define(name: string, definition: PromptDefinition): Promise<void> {
    const versionId = this.versionId()

    const version: PromptVersion = {
      id: versionId,
      template: definition.template,
      description: definition.description,
      variables: definition.variables,
      createdAt: Date.now(),
    }

    await this.writeJSON(this.metaPath(name), {
      template: definition.template,
      description: definition.description,
      variables: definition.variables,
      currentVersion: versionId,
    })

    await this.writeJSON(this.versionsPath(name), { versions: [version] })
    await this.writeJSON(this.variantsPath(name), { variants: [] })
    await this.writeJSON(this.perfPath(name), emptyPerformance())
    await this.addToIndex(name)
  }

  async render(name: string, variables: Record<string, string | number>): Promise<RenderResult> {
    const meta = await this.readJSON<{
      template: string
      description: string
      variables: string[]
      currentVersion: string
    }>(this.metaPath(name))

    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    for (const v of meta.variables) {
      if (!(v in variables)) {
        throw new Error(`Missing required variable "${v}" for prompt "${name}"`)
      }
    }

    const variants = await this.readJSON<{ variants: PromptVariant[] }>(this.variantsPath(name))
    const variantList = variants?.variants ?? []

    let template = meta.template
    let variantId: string | null = null

    if (variantList.length > 0) {
      const pick = pickWeighted(variantList)
      if (pick) {
        template = pick.template
        variantId = pick.id
      }
    }

    const text = template.replace(VARIABLE_REGEX, (_match: string, key: string) => {
      return String(variables[key] ?? `{{${key}}}`)
    })

    return { text, promptName: name, variantId }
  }

  async createVariant(name: string, variantName: string, config: PromptVariantDefinition): Promise<void> {
    const meta = await this.readJSON<object>(this.metaPath(name))
    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    const variantsFile = await this.readJSON<{ variants: PromptVariant[] }>(this.variantsPath(name))
    const variants = variantsFile?.variants ?? []

    if (variants.some((v) => v.id === variantName)) {
      throw new Error(`Variant "${variantName}" already exists for prompt "${name}"`)
    }

    variants.push({
      id: variantName,
      template: config.template,
      weight: config.weight,
      createdAt: Date.now(),
      performance: emptyPerformance(),
    })

    await this.writeJSON(this.variantsPath(name), { variants })
  }

  async track(name: string, metrics: TrackMetrics): Promise<void> {
    const meta = await this.readJSON<object>(this.metaPath(name))
    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    const perf = await this.readJSON<PromptPerformance>(this.perfPath(name))
    const current = perf ?? emptyPerformance()

    const totalCalls = current.totalCalls + 1
    const successCount = current.successCount + (metrics.success ? 1 : 0)
    const failureCount = current.failureCount + (metrics.success ? 0 : 1)
    const totalLatency = current.totalLatency + metrics.latency
    const totalTokens = current.totalTokens + metrics.tokens

    await this.writeJSON(this.perfPath(name), {
      totalCalls,
      successCount,
      failureCount,
      totalLatency,
      totalTokens,
      avgLatency: Math.round(totalLatency / totalCalls),
      avgTokens: Math.round(totalTokens / totalCalls),
      successRate: successCount / totalCalls,
    })

    if (metrics.variantId) {
      const variantsFile = await this.readJSON<{ variants: PromptVariant[] }>(this.variantsPath(name))
      if (variantsFile) {
        const variant = variantsFile.variants.find((v) => v.id === metrics.variantId)
        if (variant) {
          const vt = variant.performance.totalCalls + 1
          const vs = variant.performance.successCount + (metrics.success ? 1 : 0)
          const vf = variant.performance.failureCount + (metrics.success ? 0 : 1)
          const vl = variant.performance.totalLatency + metrics.latency
          const vtok = variant.performance.totalTokens + metrics.tokens

          variant.performance = {
            totalCalls: vt,
            successCount: vs,
            failureCount: vf,
            totalLatency: vl,
            totalTokens: vtok,
            avgLatency: Math.round(vl / vt),
            avgTokens: Math.round(vtok / vt),
            successRate: vs / vt,
          }
          await this.writeJSON(this.variantsPath(name), variantsFile)
        }
      }
    }
  }

  async getVersions(name: string): Promise<PromptVersion[]> {
    const meta = await this.readJSON<object>(this.metaPath(name))
    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    const data = await this.readJSON<{ versions: PromptVersion[] }>(this.versionsPath(name))
    return data?.versions ?? []
  }

  async rollback(name: string, version: string): Promise<void> {
    const meta = await this.readJSON<{
      template: string
      description: string
      variables: string[]
      currentVersion: string
    }>(this.metaPath(name))

    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    const data = await this.readJSON<{ versions: PromptVersion[] }>(this.versionsPath(name))
    const versions = data?.versions ?? []
    const target = versions.find((v) => v.id === version)

    if (!target) {
      throw new Error(`Version "${version}" not found for prompt "${name}"`)
    }

    await this.writeJSON(this.metaPath(name), {
      template: target.template,
      description: target.description,
      variables: target.variables,
      currentVersion: target.id,
    })
  }

  async list(): Promise<PromptStats[]> {
    const index = await this.getIndex()
    const result: PromptStats[] = []

    for (const name of index) {
      const meta = await this.readJSON<{
        template: string
        description: string
        variables: string[]
        currentVersion: string
      }>(this.metaPath(name))

      if (!meta) continue

      const versionsData = await this.readJSON<{ versions: PromptVersion[] }>(this.versionsPath(name))
      const variantsData = await this.readJSON<{ variants: PromptVariant[] }>(this.variantsPath(name))
      const perf = await this.readJSON<PromptPerformance>(this.perfPath(name))

      result.push({
        name,
        currentVersion: meta.currentVersion,
        description: meta.description,
        variables: meta.variables,
        versionCount: versionsData?.versions.length ?? 0,
        variantCount: variantsData?.variants.length ?? 0,
        performance: perf ?? emptyPerformance(),
      })
    }

    return result
  }

  async delete(name: string): Promise<void> {
    const meta = await this.readJSON<object>(this.metaPath(name))
    if (!meta) {
      throw new Error(`Prompt "${name}" not found`)
    }

    const dir = this.promptDir(name)
    await rm(dir, { recursive: true, force: true })
    await this.removeFromIndex(name)
  }
}

function pickWeighted(variants: PromptVariant[]): PromptVariant | null {
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0)
  if (totalWeight <= 0) return null

  let random = Math.random() * totalWeight
  for (const variant of variants) {
    random -= variant.weight
    if (random <= 0) return variant
  }

  const last = variants[variants.length - 1]
  return last ?? null
}
