import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync, mkdirSync, existsSync } from 'node:fs'

const { PageBuilder } = await import('../src/server/admin/builder.js')
const { AdminPanel } = await import('../src/server/admin/panel.js')

describe('PageBuilder', () => {
  let tmpDir: string
  let builder: PageBuilder

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'speexjs-admin-'))
    builder = new PageBuilder(join(tmpDir, 'pages'))
  })

  afterEach(() => {
    try {
      rmdirSync(tmpDir, { recursive: true })
    } catch {}
  })

  describe('createPage', () => {
    it('saves a page with slug, title, and components', async () => {
      await builder.createPage('home', 'Home Page', [
        { type: 'text', props: { content: 'Welcome' } },
        { type: 'hero', props: { title: 'Hello World', subtitle: 'Welcome to our site' } },
      ])
      const pages = await builder.listPages()
      expect(pages).toHaveLength(1)
      expect(pages[0].slug).toBe('home')
      expect(pages[0].title).toBe('Home Page')
    })

    it('persists page to disk', async () => {
      await builder.createPage('about', 'About Us', [{ type: 'text', props: { content: 'About content' } }])
      const filePath = join(builder['storeDir'], 'about.json')
      expect(existsSync(filePath)).toBe(true)
    })
  })

  describe('getPage', () => {
    it('retrieves a saved page', async () => {
      await builder.createPage('contact', 'Contact', [{ type: 'text', props: { content: 'Contact us' } }])
      const page = await builder.getPage('contact')
      expect(page).not.toBeNull()
      expect(page!.title).toBe('Contact')
      expect(page!.components).toHaveLength(1)
      expect(page!.components[0].type).toBe('text')
    })

    it('returns null for missing page', async () => {
      expect(await builder.getPage('nonexistent')).toBeNull()
    })
  })

  describe('listPages', () => {
    it('lists all saved pages', async () => {
      await builder.createPage('a', 'Page A', [])
      await builder.createPage('b', 'Page B', [])
      const pages = await builder.listPages()
      expect(pages).toHaveLength(2)
    })
  })

  describe('deletePage', () => {
    it('removes a page', async () => {
      await builder.createPage('temp', 'Temp', [])
      await builder.deletePage('temp')
      expect(await builder.getPage('temp')).toBeNull()
    })

    it('does not throw when deleting non-existent page', async () => {
      await expect(builder.deletePage('ghost')).resolves.toBeUndefined()
    })
  })

  describe('renderPage', () => {
    it('renders page as HTML', async () => {
      await builder.createPage('test', 'Test', [{ type: 'text', props: { content: 'Hello' } }])
      const html = await builder.renderPage('test')
      expect(html).toContain('Test')
      expect(html).toContain('Hello')
      expect(html).toContain('tailwindcss')
    })

    it('throws for missing page', async () => {
      await expect(builder.renderPage('missing')).rejects.toThrow('not found')
    })
  })

  describe('exportToTsx', () => {
    it('generates TSX component', async () => {
      await builder.createPage('landing', 'Landing', [{ type: 'hero', props: { title: 'Big Title', ctaText: 'Buy Now' } }])
      const tsx = await builder.exportToTsx('landing')
      expect(tsx).toContain('LandingPage')
      expect(tsx).toContain('VNode')
      expect(tsx).toContain('Big Title')
    })

    it('throws for missing page', async () => {
      await expect(builder.exportToTsx('missing')).rejects.toThrow('not found')
    })
  })

  describe('registerRoutes', () => {
    it('registers admin builder routes on the app', () => {
      const app = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any
      builder.registerRoutes(app)
      expect(app.get).toHaveBeenCalled()
      expect(app.post).toHaveBeenCalled()
      expect(app.put).toHaveBeenCalled()
      expect(app.delete).toHaveBeenCalled()
    })
  })
})

describe('AdminPanel', () => {
  let panel: AdminPanel

  beforeEach(() => {
    panel = new AdminPanel()
  })

  describe('registerResource', () => {
    it('registers a resource', () => {
      panel.registerResource({
        name: 'users',
        table: 'users',
        label: 'User',
        plural: 'Users',
        fields: [
          { name: 'id', label: 'ID', type: 'number' },
          { name: 'name', label: 'Name', type: 'string', searchable: true },
          { name: 'email', label: 'Email', type: 'email' },
        ],
      })
      // internal state is private, but registerRoutes exposes via call count
      const app = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any
      panel.registerRoutes(app)
      expect(app.get).toHaveBeenCalled()
      expect(app.post).toHaveBeenCalled()
      expect(app.put).toHaveBeenCalled()
      expect(app.delete).toHaveBeenCalled()
    })
  })

  describe('setDatabase', () => {
    it('accepts a database instance', () => {
      const db = { table: vi.fn() }
      panel.setDatabase(db)
      panel.registerResource({
        name: 'posts',
        table: 'posts',
        label: 'Post',
        plural: 'Posts',
        fields: [
          { name: 'title', label: 'Title', type: 'string' },
          { name: 'body', label: 'Body', type: 'text' },
        ],
      })
      const app = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any
      panel.registerRoutes(app)
      expect(app.get).toHaveBeenCalled()
    })
  })

  describe('auto-generated CRUD routes', () => {
    it('registers dashboard route at /_speexjs/admin', () => {
      const app = {
        get: vi.fn((path: string) => {}),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any
      panel.registerRoutes(app)
      const dashboardCall = app.get.mock.calls.find((c: any) => c[0] === '/_speexjs/admin')
      expect(dashboardCall).toBeDefined()
    })

    it('registers list, create, edit, delete routes per resource', () => {
      panel.registerResource({
        name: 'products',
        table: 'products',
        label: 'Product',
        plural: 'Products',
        fields: [{ name: 'title', label: 'Title', type: 'string' }],
      })
      const app = {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      } as any
      panel.registerRoutes(app)
      const paths = app.get.mock.calls.map((c: any) => c[0])
      expect(paths).toContain('/_speexjs/admin/products')
      expect(paths).toContain('/_speexjs/admin/products/create')
      expect(paths).toContain('/_speexjs/admin/products/:id/edit')
    })
  })
})
