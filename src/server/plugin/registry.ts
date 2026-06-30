import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { colors } from '../../native/colors.js'
import type { SpeexPlugin } from './index.js'

export interface PluginManifest {
  name: string
  version: string
  description: string
  entry: string
  hooks?: string[]
  dependencies?: Record<string, string>
}

export interface RegistryPlugin {
  manifest: PluginManifest
  path: string
  loaded: boolean
}

export class PluginRegistry {
  private plugins: Map<string, RegistryPlugin> = new Map()
  private pluginDir: string

  constructor(pluginDir?: string) {
    this.pluginDir = pluginDir || resolve(process.cwd(), 'plugins')
  }

  getPluginDir(): string {
    return this.pluginDir
  }

  scanLocal(): RegistryPlugin[] {
    if (!existsSync(this.pluginDir)) {
      return []
    }

    const entries = readdirSync(this.pluginDir, { withFileTypes: true })
    const found: RegistryPlugin[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const manifestPath = resolve(this.pluginDir, entry.name, 'speexjs-plugin.json')
      if (!existsSync(manifestPath)) continue

      try {
        const manifest: PluginManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        const plugin: RegistryPlugin = {
          manifest,
          path: resolve(this.pluginDir, entry.name),
          loaded: false,
        }
        this.plugins.set(manifest.name, plugin)
        found.push(plugin)
      } catch {
        console.error(`  ${colors.yellow('!')} Invalid manifest in plugin '${entry.name}'`)
      }
    }

    return found
  }

  async install(name: string, source?: string): Promise<RegistryPlugin> {
    const targetDir = resolve(this.pluginDir, name)

    if (existsSync(targetDir)) {
      throw new Error(`Plugin '${name}' is already installed at ${targetDir}`)
    }

    mkdirSync(targetDir, { recursive: true })

    const manifest: PluginManifest = {
      name,
      version: '0.1.0',
      description: `${name} plugin for SpeexJS`,
      entry: 'index.js',
      hooks: [],
    }

    if (source) {
      await this.installFromRemote(name, source, targetDir, manifest)
    } else {
      this.installLocal(name, targetDir, manifest)
    }

    writeFileSync(resolve(targetDir, 'speexjs-plugin.json'), JSON.stringify(manifest, null, 2), 'utf-8')

    const plugin: RegistryPlugin = {
      manifest,
      path: targetDir,
      loaded: false,
    }
    this.plugins.set(name, plugin)
    return plugin
  }

  private installLocal(name: string, targetDir: string, manifest: PluginManifest): void {
    manifest.entry = 'index.js'
    writeFileSync(
      resolve(targetDir, 'index.js'),
      `// ${name} plugin — SpeexJS
module.exports = {
  name: '${name}',
  version: '${manifest.version}',
  register: (app) => {
    console.log('[${name}] Plugin registered')
  },
  boot: () => {
    console.log('[${name}] Plugin booted')
  },
  shutdown: () => {
    console.log('[${name}] Plugin shut down')
  },
}
`,
      'utf-8',
    )
    if (!existsSync(resolve(targetDir, 'package.json'))) {
      writeFileSync(
        resolve(targetDir, 'package.json'),
        JSON.stringify(
          {
            name: `speexjs-plugin-${name}`,
            version: manifest.version,
            private: true,
            main: manifest.entry,
          },
          null,
          2,
        ),
        'utf-8',
      )
    }
  }

  private async installFromRemote(_name: string, source: string, targetDir: string, manifest: PluginManifest): Promise<void> {
    const sources = {
      npm: async () => {
        const { execSync } = await import('child_process')
        execSync(`npm install ${source} --prefix ${targetDir} --no-save`, { stdio: 'inherit' })
        const pkgJson = JSON.parse(readFileSync(resolve(targetDir, 'node_modules', source, 'package.json'), 'utf-8'))
        manifest.version = pkgJson.version
        manifest.description = pkgJson.description || manifest.description
        manifest.entry = pkgJson.main || 'index.js'
      },
      github: async () => {
        const { execSync } = await import('child_process')
        const repoPath = source.replace('github:', '')
        execSync(`git clone https://github.com/${repoPath}.git ${resolve(targetDir, 'repo')}`, { stdio: 'inherit' })
        const repoManifestPath = resolve(targetDir, 'repo', 'speexjs-plugin.json')
        if (existsSync(repoManifestPath)) {
          const repoManifest: PluginManifest = JSON.parse(readFileSync(repoManifestPath, 'utf-8'))
          Object.assign(manifest, repoManifest)
        }
        const nodeModulesDir = resolve(targetDir, 'node_modules')
        if (!existsSync(nodeModulesDir)) {
          mkdirSync(nodeModulesDir, { recursive: true })
        }
      },
    }

    const type = source.startsWith('npm:') ? 'npm' : source.startsWith('github:') ? 'github' : 'npm'
    await sources[type]()
  }

  async load(name: string): Promise<SpeexPlugin | null> {
    const plugin = this.plugins.get(name)
    if (!plugin) {
      console.error(`  ${colors.red('✗')} Plugin '${name}' not found in registry`)
      return null
    }

    try {
      const pluginModule = await import(/* @vite-ignore */ resolve(plugin.path, plugin.manifest.entry))
      const speexPlugin: SpeexPlugin = {
        name: plugin.manifest.name,
        register: pluginModule.default?.register || pluginModule.register,
        boot: pluginModule.default?.boot || pluginModule.boot,
        shutdown: pluginModule.default?.shutdown || pluginModule.shutdown,
      }
      plugin.loaded = true
      return speexPlugin
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ${colors.red('✗')} Failed to load plugin '${name}': ${message}`)
      return null
    }
  }

  async loadAll(): Promise<SpeexPlugin[]> {
    this.scanLocal()
    const loaded: SpeexPlugin[] = []
    for (const [name] of this.plugins) {
      const plugin = await this.load(name)
      if (plugin) loaded.push(plugin)
    }
    return loaded
  }

  list(): RegistryPlugin[] {
    this.scanLocal()
    return Array.from(this.plugins.values())
  }

  remove(name: string): boolean {
    return this.plugins.delete(name)
  }
}

let _registry: PluginRegistry | null = null

export function getRegistry(pluginDir?: string): PluginRegistry {
  if (!_registry) {
    _registry = new PluginRegistry(pluginDir)
  }
  return _registry
}
