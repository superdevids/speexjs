import type { SuperApp } from '../index.js'
import {
  type CorsOptions,
  type Middleware,
  type SessionOptions,
  cors,
  bodyParser,
  session,
  csrf,
  helmet,
  compress,
  logger,
} from '../middleware'
import type { SpeexPlugin } from './index.js'

export interface PresetConfig {
  middleware: Middleware[]
  plugin?: SpeexPlugin
}

export function api(corsOptions?: CorsOptions): PresetConfig {
  return {
    middleware: [cors({ ...corsOptions, credentials: true }), bodyParser(), helmet(), compress(), logger()],
  }
}

export function web(sessionOptions?: SessionOptions): PresetConfig {
  return {
    middleware: [session(sessionOptions), csrf(), bodyParser(), helmet(), compress(), logger()],
  }
}

export function spa(corsOptions?: CorsOptions): PresetConfig {
  return {
    middleware: [cors({ ...corsOptions, credentials: true }), bodyParser(), helmet(), compress(), logger()],
  }
}

export function minimal(): PresetConfig {
  return {
    middleware: [bodyParser(), cors()],
  }
}

export function applyPreset(app: SuperApp, preset: PresetConfig): SuperApp {
  for (const mw of preset.middleware) {
    app.use(mw)
  }
  return app
}
