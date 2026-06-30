import { PluginRegistry } from '../../server/plugin/registry.js'
import { PluginMarketplace, PLUGIN_CATEGORIES } from '../../server/plugin/marketplace.js'
import type { PluginInfo } from '../../server/plugin/marketplace.js'
import { colors } from '../../native/colors.js'

export async function pluginInstall(name: string, options: Record<string, any>): Promise<void> {
  const source = (options.source as string) || (options.from as string) || undefined
  const registry = new PluginRegistry()

  console.log(`  ${colors.cyan('→')} Installing plugin: ${colors.white(name)}`)

  try {
    const plugin = await registry.install(name, source)
    console.log(`  ${colors.green('✓')} Plugin '${plugin.manifest.name}' v${plugin.manifest.version} installed`)
    console.log(`  ${colors.dim('  Path:')} ${plugin.path}`)
    if (plugin.manifest.hooks?.length) {
      console.log(`  ${colors.dim('  Hooks:')} ${plugin.manifest.hooks.join(', ')}`)
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  ${colors.red('✗')} Failed to install plugin: ${message}`)
    process.exit(1)
  }
}

export async function pluginList(): Promise<void> {
  const registry = new PluginRegistry()
  const plugins = registry.list()

  if (plugins.length === 0) {
    console.log(`  ${colors.yellow('!')} No plugins found. Install one with: ${colors.cyan('speexjs plugin:install <name>')}`)
    console.log(`  ${colors.dim('  Plugins directory:')} ${registry.getPluginDir()}`)
    return
  }

  console.log(`\n  ${colors.bold('Installed Plugins')}`)
  console.log(`  ${colors.dim('─'.repeat(50))}`)

  for (const plugin of plugins) {
    const status = plugin.loaded ? colors.green('loaded') : colors.yellow('scanned')
    console.log(`  ${colors.green('●')} ${colors.white(plugin.manifest.name)} ${colors.dim(`v${plugin.manifest.version}`)} ${status}`)
    if (plugin.manifest.description) {
      console.log(`    ${colors.dim(plugin.manifest.description)}`)
    }
    if (plugin.manifest.hooks?.length) {
      console.log(`    ${colors.dim('Hooks:')} ${plugin.manifest.hooks.join(', ')}`)
    }
    if (plugin.manifest.dependencies) {
      const deps = Object.keys(plugin.manifest.dependencies)
      console.log(`    ${colors.dim('Dependencies:')} ${deps.join(', ')}`)
    }
    console.log()
  }

  console.log(`  ${colors.dim('Total:')} ${plugins.length} plugin(s)\n`)
}

export async function pluginSearch(query: string, options: Record<string, any>): Promise<void> {
  const category = options.category as string | undefined
  const detail = options.detail === true

  console.log()

  if (category) {
    console.log(`  ${colors.cyan('→')} Searching plugins: ${colors.white(query || '*')} ${colors.dim(`[category: ${category}]`)}`)
  } else {
    console.log(`  ${colors.cyan('→')} Searching plugins: ${colors.white(query || '*')}`)
  }

  let results: PluginInfo[]

  try {
    results = await PluginMarketplace.search(query, category)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`  ${colors.red('✗')} Search failed: ${message}`)
    process.exit(1)
  }

  if (results.length === 0) {
    console.log(`  ${colors.yellow('!')} No plugins found matching "${query}"${category ? ` in category "${category}"` : ''}.`)
    if (!category) {
      console.log(`  ${colors.dim('  Tip:')} Browse categories with ${colors.cyan('speexjs plugin:search --category <name>')}`)
      console.log(`  ${colors.dim('  Categories:')} ${PLUGIN_CATEGORIES.join(', ')}`)
    }
    console.log()
    return
  }

  if (detail) {
    printDetailedResults(results)
  } else {
    printCompactResults(results)
  }

  console.log(`  ${colors.dim('Total:')} ${results.length} plugin(s)`)
  console.log()
}

/* ------------------------------------------------------------------ */
/*  Result display helpers                                             */
/* ------------------------------------------------------------------ */

function printCompactResults(plugins: PluginInfo[]): void {
  console.log(`  ${colors.bold('Available Plugins')}`)
  console.log(`  ${colors.dim('─'.repeat(56))}`)

  for (const plugin of plugins) {
    const downloads = plugin.downloads >= 1_000 ? `${(plugin.downloads / 1_000).toFixed(1)}k` : String(plugin.downloads)

    console.log(`  ${colors.green('●')} ${colors.white(plugin.name)} ${colors.dim(`v${plugin.version}`)}`)
    console.log(`    ${colors.dim(plugin.description)}`)
    console.log(
      `    ${colors.cyan('⬇')} ${colors.dim(`${downloads}`)}  ${colors.yellow('★')} ${colors.dim(`${plugin.stars}`)}  ${colors.magenta('▸')} ${colors.dim(plugin.category)}`,
    )
    if (plugin.homepage) {
      console.log(`    ${colors.dim(plugin.homepage)}`)
    }
    console.log()
  }
}

function printDetailedResults(plugins: PluginInfo[]): void {
  for (const plugin of plugins) {
    console.log(`  ${colors.bold(plugin.name)} ${colors.dim(`v${plugin.version}`)}`)
    console.log(`  ${colors.dim('─'.repeat(50))}`)
    console.log(`  ${colors.dim('Description:')}  ${plugin.description}`)
    console.log(`  ${colors.dim('Author:')}       ${plugin.author}`)
    console.log(`  ${colors.dim('Category:')}     ${plugin.category}`)
    console.log(`  ${colors.dim('Downloads:')}    ${plugin.downloads.toLocaleString()}`)
    console.log(`  ${colors.dim('Stars:')}        ${plugin.stars}`)
    console.log(`  ${colors.dim('SpeexJS:')}      ${plugin.speexVersion}`)
    console.log(`  ${colors.dim('Tags:')}         ${plugin.tags.join(', ')}`)
    if (plugin.homepage) console.log(`  ${colors.dim('Homepage:')}     ${plugin.homepage}`)
    if (plugin.repository) console.log(`  ${colors.dim('Repository:')}   ${plugin.repository}`)
    console.log()
  }
}

export { PLUGIN_CATEGORIES } from '../../server/plugin/marketplace.js'
