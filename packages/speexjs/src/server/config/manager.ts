import { readFileSync, existsSync } from 'node:fs'
import { join, resolve, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface SpeexConfig {
  app: {
    name: string
    port: number
    host: string
    env: 'development' | 'production' | 'testing'
    key?: string
    debug: boolean
  }
  database: {
    default: string
    connections: Record<
      string,
      {
        driver: 'mysql' | 'postgresql' | 'sqlite'
        host?: string
        port?: number
        database: string
        username?: string
        password?: string
      }
    >
  }
  auth: {
    defaults: { guard: string }
    guards: Record<string, any>
  }
  server: {
    cors: { origin: string | string[]; credentials: boolean }
    session: { driver: 'cookie' | 'redis'; ttl: number }
    rateLimit: { max: number; window: number }
  }
  paths: {
    root: string
    src: string
    routes: string
    views: string
    migrations: string
    public: string
  }
}

export function defineConfig(config: SpeexConfig): SpeexConfig {
  return config
}

function defaults(root: string): SpeexConfig {
  return {
    app: {
      name: 'SpeexJS',
      port: 3000,
      host: '0.0.0.0',
      env: 'development',
      debug: true,
    },
    database: {
      default: 'sqlite',
      connections: {},
    },
    auth: {
      defaults: { guard: 'session' },
      guards: {},
    },
    server: {
      cors: { origin: '*', credentials: true },
      session: { driver: 'cookie', ttl: 120 },
      rateLimit: { max: 60, window: 60 },
    },
    paths: {
      root,
      src: join(root, 'src'),
      routes: join(root, 'src', 'routes'),
      views: join(root, 'src', 'views'),
      migrations: join(root, 'migrations'),
      public: join(root, 'public'),
    },
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sv = source[key]
    const tv = target[key]
    if (sv !== undefined && isObject(sv) && isObject(tv)) {
      result[key] = deepMerge(tv, sv)
    } else if (sv !== undefined) {
      result[key] = sv
    }
  }
  return result
}

function resolvePaths(cfg: SpeexConfig): SpeexConfig {
  const root = isAbsolute(cfg.paths.root) ? cfg.paths.root : resolve(process.cwd(), cfg.paths.root)
  return {
    ...cfg,
    paths: {
      root,
      src: isAbsolute(cfg.paths.src) ? cfg.paths.src : resolve(root, cfg.paths.src),
      routes: isAbsolute(cfg.paths.routes) ? cfg.paths.routes : resolve(root, cfg.paths.routes),
      views: isAbsolute(cfg.paths.views) ? cfg.paths.views : resolve(root, cfg.paths.views),
      migrations: isAbsolute(cfg.paths.migrations) ? cfg.paths.migrations : resolve(root, cfg.paths.migrations),
      public: isAbsolute(cfg.paths.public) ? cfg.paths.public : resolve(root, cfg.paths.public),
    },
  }
}

const CONFIG_FILES = ['speexjs.config.ts', 'speexjs.config.js', 'speexjs.config.mjs', 'speexjs.json']

export async function loadConfig(root?: string): Promise<SpeexConfig> {
  const base = root ?? process.cwd()
  let cfg = defaults(base)

  for (const file of CONFIG_FILES) {
    const full = join(base, file)
    if (!existsSync(full)) continue

    if (file.endsWith('.json')) {
      const raw = readFileSync(full, 'utf-8')
      const parsed = JSON.parse(raw)
      cfg = deepMerge(cfg as unknown as Record<string, unknown>, parsed) as unknown as SpeexConfig
    } else {
      const url = pathToFileURL(full).href
      const mod = await import(url)
      const userCfg: SpeexConfig | undefined = mod.default ?? mod.config
      if (userCfg) {
        cfg = deepMerge(cfg as unknown as Record<string, unknown>, userCfg as unknown as Record<string, unknown>) as unknown as SpeexConfig
      }
    }
    break
  }

  return resolvePaths(cfg)
}
