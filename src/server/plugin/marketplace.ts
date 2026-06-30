/**
 * Plugin Marketplace — search, discover, and browse SpeexJS plugins.
 *
 * Fetches from the official registry (https://plugins.speexjs.dev) with
 * a built-in curated fallback when the registry is unreachable.
 */

export const PLUGIN_CATEGORIES = [
  'payments',
  'authentication',
  'storage',
  'email',
  'monitoring',
  'search',
  'queue',
  'ai',
  'utils',
] as const

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number]

export interface PluginInfo {
  name: string
  description: string
  version: string
  author: string
  downloads: number
  stars: number
  speexVersion: string
  category: string
  tags: string[]
  homepage?: string
  repository?: string
}

/* ------------------------------------------------------------------ */
/*  Curated plugin registry (fallback when API is unreachable)         */
/* ------------------------------------------------------------------ */

const CURATED_PLUGINS: PluginInfo[] = [
  {
    name: 'speexjs-stripe',
    description: 'Accept payments via Stripe — one-time, subscriptions, webhooks, and customer portal',
    version: '1.2.0',
    author: 'SpeexJS',
    downloads: 15_230,
    stars: 342,
    speexVersion: '>=1.0.0',
    category: 'payments',
    tags: ['stripe', 'payments', 'checkout', 'subscription', 'webhook'],
    homepage: 'https://github.com/superdevids/speexjs-stripe',
    repository: 'github:superdevids/speexjs-stripe',
  },
  {
    name: 'speexjs-auth',
    description: 'Authentication & authorization — JWT, OAuth2, MFA, session management, RBAC',
    version: '2.1.0',
    author: 'SpeexJS',
    downloads: 28_450,
    stars: 891,
    speexVersion: '>=1.0.0',
    category: 'authentication',
    tags: ['auth', 'jwt', 'oauth', 'session', 'rbac', 'mfa'],
    homepage: 'https://github.com/superdevids/speexjs-auth',
    repository: 'github:superdevids/speexjs-auth',
  },
  {
    name: 'speexjs-s3',
    description: 'File storage adapter for S3-compatible services (AWS, MinIO, DigitalOcean Spaces)',
    version: '1.0.3',
    author: 'SpeexJS',
    downloads: 9_870,
    stars: 210,
    speexVersion: '>=1.0.0',
    category: 'storage',
    tags: ['s3', 'storage', 'file-upload', 'aws', 'minio'],
    homepage: 'https://github.com/superdevids/speexjs-s3',
    repository: 'github:superdevids/speexjs-s3',
  },
  {
    name: 'speexjs-mail',
    description: 'Transactional email — SMTP, SendGrid, Mailgun, SES with templates and queues',
    version: '1.1.1',
    author: 'SpeexJS',
    downloads: 12_100,
    stars: 283,
    speexVersion: '>=1.0.0',
    category: 'email',
    tags: ['email', 'mail', 'sendgrid', 'smtp', 'ses', 'mailgun'],
    homepage: 'https://github.com/superdevids/speexjs-mail',
    repository: 'github:superdevids/speexjs-mail',
  },
  {
    name: 'speexjs-sentry',
    description: 'Error tracking & performance monitoring via Sentry — source maps, breadcrumbs, spans',
    version: '1.0.2',
    author: 'SpeexJS',
    downloads: 7_340,
    stars: 156,
    speexVersion: '>=1.0.0',
    category: 'monitoring',
    tags: ['sentry', 'error-tracking', 'monitoring', 'performance'],
    homepage: 'https://github.com/superdevids/speexjs-sentry',
    repository: 'github:superdevids/speexjs-sentry',
  },
  {
    name: 'speexjs-meilisearch',
    description: 'Full-text search powered by Meilisearch — typo-tolerant, faceted, instant',
    version: '1.0.0',
    author: 'SpeexJS',
    downloads: 6_540,
    stars: 189,
    speexVersion: '>=1.0.0',
    category: 'search',
    tags: ['search', 'meilisearch', 'fulltext', 'faceted'],
    homepage: 'https://github.com/superdevids/speexjs-meilisearch',
    repository: 'github:superdevids/speexjs-meilisearch',
  },
  {
    name: 'speexjs-bull',
    description: 'Background jobs & queue management via Bull/BullMQ — delays, repeats, concurrency',
    version: '2.0.1',
    author: 'SpeexJS',
    downloads: 11_200,
    stars: 421,
    speexVersion: '>=1.0.0',
    category: 'queue',
    tags: ['queue', 'bull', 'bullmq', 'jobs', 'background'],
    homepage: 'https://github.com/superdevids/speexjs-bull',
    repository: 'github:superdevids/speexjs-bull',
  },
  {
    name: 'speexjs-openai',
    description: 'AI integration — OpenAI (GPT, embeddings, vision), streaming, and tool-calling helpers',
    version: '1.3.0',
    author: 'SpeexJS',
    downloads: 20_560,
    stars: 654,
    speexVersion: '>=1.0.0',
    category: 'ai',
    tags: ['ai', 'openai', 'gpt', 'embeddings', 'streaming'],
    homepage: 'https://github.com/superdevids/speexjs-openai',
    repository: 'github:superdevids/speexjs-openai',
  },
  {
    name: 'speexjs-rate-limiter',
    description: 'Rate limiting with in-memory, Redis, and D1 backends — sliding window, token bucket',
    version: '1.0.1',
    author: 'SpeexJS',
    downloads: 8_900,
    stars: 198,
    speexVersion: '>=1.0.0',
    category: 'utils',
    tags: ['rate-limit', 'throttle', 'redis', 'd1'],
    homepage: 'https://github.com/superdevids/speexjs-rate-limiter',
    repository: 'github:superdevids/speexjs-rate-limiter',
  },
  {
    name: 'speexjs-cors',
    description: 'Advanced CORS middleware — origins, methods, headers, preflight caching, credentials',
    version: '1.0.0',
    author: 'SpeexJS',
    downloads: 32_800,
    stars: 112,
    speexVersion: '>=0.5.0',
    category: 'utils',
    tags: ['cors', 'middleware', 'headers', 'security'],
    homepage: 'https://github.com/superdevids/speexjs-cors',
    repository: 'github:superdevids/speexjs-cors',
  },
  {
    name: 'speexjs-socket',
    description: 'Real-time WebSocket server — rooms, events, presence, auto-reconnect, broadcasting',
    version: '1.1.0',
    author: 'SpeexJS',
    downloads: 14_780,
    stars: 367,
    speexVersion: '>=1.0.0',
    category: 'utils',
    tags: ['websocket', 'realtime', 'socket', 'events', 'broadcast'],
    homepage: 'https://github.com/superdevids/speexjs-socket',
    repository: 'github:superdevids/speexjs-socket',
  },
  {
    name: 'speexjs-cron',
    description: 'Scheduled job runner — cron expressions, timezone support, logging, retry',
    version: '1.0.2',
    author: 'SpeexJS',
    downloads: 5_680,
    stars: 145,
    speexVersion: '>=1.0.0',
    category: 'utils',
    tags: ['cron', 'scheduler', 'jobs', 'tasks', 'automation'],
    homepage: 'https://github.com/superdevids/speexjs-cron',
    repository: 'github:superdevids/speexjs-cron',
  },
]

/* ------------------------------------------------------------------ */
/*  PluginMarketplace                                                  */
/* ------------------------------------------------------------------ */

export class PluginMarketplace {
  /** Official registry base URL. */
  static readonly OFFICIAL_REGISTRY = 'https://plugins.speexjs.dev'

  /**
   * Search plugins by keyword, optionally filtering by category.
   *
   * Tries the official registry first. Falls back to the curated
   * list when the network request fails or times out.
   */
  static async search(query: string, category?: string): Promise<PluginInfo[]> {
    try {
      const params = new URLSearchParams()
      if (query) params.set('q', query)
      if (category) params.set('category', category)

      const url = `${this.OFFICIAL_REGISTRY}/api/plugins?${params.toString()}`
      const results = await this.fetchFromRegistry(url)
      if (results !== null) return results
    } catch {
      // Registry unreachable — fall through to curated list
    }

    return this.searchCurated(query, category)
  }

  /**
   * Get detailed information about a specific plugin by name.
   */
  static async info(name: string): Promise<PluginInfo | null> {
    try {
      const url = `${this.OFFICIAL_REGISTRY}/api/plugins/${encodeURIComponent(name)}`
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5_000),
        headers: { Accept: 'application/json' },
      })

      if (response.ok) {
        const data = (await response.json()) as PluginInfo
        return data
      }
    } catch {
      // Registry unreachable — fall through to curated lookup
    }

    return this.findCurated(name)
  }

  /**
   * Get trending / popular plugins (sorted by downloads).
   */
  static async trending(): Promise<PluginInfo[]> {
    try {
      const url = `${this.OFFICIAL_REGISTRY}/api/plugins/trending`
      const results = await this.fetchFromRegistry(url)
      if (results !== null) return results
    } catch {
      // Registry unreachable — fall through to curated list
    }

    return [...CURATED_PLUGINS].sort((a, b) => b.downloads - a.downloads)
  }

  /* ---------------------------------------------------------------- */
  /*  Private helpers                                                  */
  /* ---------------------------------------------------------------- */

  /**
   * Fetch a JSON array of plugins from the registry.
   * Returns `null` on any network or parse error so callers can fall back.
   */
  private static async fetchFromRegistry(url: string): Promise<PluginInfo[] | null> {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) return null

    const data = (await response.json()) as PluginInfo[] | PluginInfo
    return Array.isArray(data) ? data : [data]
  }

  /** Search the curated list in-memory. */
  private static searchCurated(query: string, category?: string): PluginInfo[] {
    const q = query.toLowerCase().trim()

    return CURATED_PLUGINS.filter((plugin) => {
      // Category filter
      if (category && plugin.category !== category.toLowerCase()) return false

      // No query → show all (within category if specified)
      if (!q) return true

      // Text search across name, description, author, and tags
      return (
        plugin.name.toLowerCase().includes(q) ||
        plugin.description.toLowerCase().includes(q) ||
        plugin.author.toLowerCase().includes(q) ||
        plugin.tags.some((t) => t.toLowerCase().includes(q))
      )
    })
  }

  /** Look up a single plugin by name in the curated list. */
  private static findCurated(name: string): PluginInfo | null {
    return CURATED_PLUGINS.find(
      (p) => p.name.toLowerCase() === name.toLowerCase(),
    ) ?? null
  }
}
