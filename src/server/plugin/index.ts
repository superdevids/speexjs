import type { SuperApp } from '../index.js'

export interface SpeexPlugin {
  name: string
  register(app: SuperApp): void | Promise<void>
  boot?(): void | Promise<void>
  shutdown?(): void | Promise<void>
}

export class PluginManager {
  private plugins: Map<string, SpeexPlugin> = new Map()
  private app: SuperApp

  constructor(app: SuperApp) {
    this.app = app
  }

  async register(plugin: SpeexPlugin): Promise<void> {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" already registered`)
    }
    this.plugins.set(plugin.name, plugin)
    await plugin.register(this.app)
  }

  async bootAll(): Promise<void> {
    for (const [, plugin] of this.plugins) {
      await plugin.boot?.()
    }
  }

  async shutdownAll(): Promise<void> {
    for (const [, plugin] of this.plugins) {
      await plugin.shutdown?.()
    }
  }

  get(name: string): SpeexPlugin | undefined {
    return this.plugins.get(name)
  }
}
