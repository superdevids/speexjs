import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { FlagManager } = await import('../src/server/flags/dashboard.js')
const { FeatureFlags } = await import('../src/server/flags/index.js')

describe('FlagManager', () => {
  let fm: FlagManager

  beforeEach(() => {
    fm = new FlagManager()
  })

  describe('define', () => {
    it('stores a flag with name and enabled state', () => {
      fm.define({ name: 'new-dashboard', description: 'New dashboard UI', enabled: false })
      const list = fm.list()
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('new-dashboard')
      expect(list[0].enabled).toBe(false)
    })

    it('stores a flag with rollout percentage', () => {
      fm.define({ name: 'dark-mode', description: 'Dark mode', enabled: true, rollout: 50 })
      expect(fm.list()[0].rollout).toBe(50)
    })

    it('stores a flag with user targets', () => {
      fm.define({
        name: 'beta-feature',
        description: 'Beta feature',
        enabled: true,
        targets: [
          { type: 'user', value: 'user-123' },
          { type: 'role', value: 'admin' },
        ],
      })
      expect(fm.list()[0].targets).toHaveLength(2)
    })

    it('stores a flag with A/B variants', () => {
      fm.define({
        name: 'pricing-experiment',
        description: 'Pricing A/B test',
        enabled: true,
        variants: { control: 50, treatment: 50 },
      })
      expect(fm.list()[0].variants).toEqual({ control: 50, treatment: 50 })
    })

    it('preserves analytics on re-define', () => {
      fm.define({ name: 'flag', description: '', enabled: true })
      fm.isEnabled('flag')
      fm.define({ name: 'flag', description: 'Updated', enabled: false })
      expect(fm.listWithAnalytics()[0].analytics.checks).toBeGreaterThanOrEqual(1)
    })
  })

  describe('isEnabled', () => {
    it('returns true for enabled flag', () => {
      fm.define({ name: 'on', description: '', enabled: true })
      expect(fm.isEnabled('on')).toBe(true)
    })

    it('returns false for disabled flag', () => {
      fm.define({ name: 'off', description: '', enabled: false })
      expect(fm.isEnabled('off')).toBe(false)
    })

    it('returns false for undefined flag', () => {
      expect(fm.isEnabled('nonexistent')).toBe(false)
    })

    it('respects rollout percentage', () => {
      fm.define({ name: 'rollout', description: '', enabled: true, rollout: 0 })
      expect(fm.isEnabled('rollout', { userId: 'user-1' })).toBe(false)
    })

    it('always enables within 100% rollout', () => {
      fm.define({ name: 'full-rollout', description: '', enabled: true, rollout: 100 })
      expect(fm.isEnabled('full-rollout', { userId: 'any-user' })).toBe(true)
    })

    it('respects user targeting', () => {
      fm.define({
        name: 'targeted',
        description: '',
        enabled: true,
        targets: [{ type: 'user', value: 'special-user' }],
      })
      expect(fm.isEnabled('targeted', { userId: 'special-user' })).toBe(true)
      expect(fm.isEnabled('targeted', { userId: 'other-user' })).toBe(false)
    })

    it('respects role targeting', () => {
      fm.define({
        name: 'admin-only',
        description: '',
        enabled: true,
        targets: [{ type: 'role', value: 'admin' }],
      })
      expect(fm.isEnabled('admin-only', { role: 'admin' })).toBe(true)
      expect(fm.isEnabled('admin-only', { role: 'user' })).toBe(false)
    })

    it('target matched flag bypasses rollout check', () => {
      fm.define({
        name: 'executive-override',
        description: '',
        enabled: true,
        rollout: 0,
        targets: [{ type: 'user', value: 'ceo' }],
      })
      expect(fm.isEnabled('executive-override', { userId: 'ceo' })).toBe(true)
    })

    it('default enabled for flag without targets or rollout', () => {
      fm.define({ name: 'simple', description: '', enabled: true })
      expect(fm.isEnabled('simple', { userId: 'anyone' })).toBe(true)
    })
  })

  describe('getVariant', () => {
    it('returns correct variant based on userId hash', () => {
      fm.define({
        name: 'ab-test',
        description: '',
        enabled: true,
        variants: { control: 50, treatment: 50 },
      })
      const variant = fm.getVariant('ab-test', { userId: 'consistent-user' })
      expect(['control', 'treatment']).toContain(variant)
    })

    it('returns consistent variant for same userId', () => {
      fm.define({
        name: 'consistent',
        description: '',
        enabled: true,
        variants: { A: 50, B: 50 },
      })
      const v1 = fm.getVariant('consistent', { userId: 'stable-user' })
      const v2 = fm.getVariant('consistent', { userId: 'stable-user' })
      expect(v1).toBe(v2)
    })

    it('returns null for flag without variants', () => {
      fm.define({ name: 'no-variants', description: '', enabled: true })
      expect(fm.getVariant('no-variants', { userId: 'u1' })).toBeNull()
    })

    it('returns null when no context userId', () => {
      fm.define({
        name: 'needs-user',
        description: '',
        enabled: true,
        variants: { A: 100 },
      })
      expect(fm.getVariant('needs-user')).toBeNull()
    })

    it('returns null for undefined flag', () => {
      expect(fm.getVariant('missing')).toBeNull()
    })
  })

  describe('list / listWithAnalytics', () => {
    it('list hides analytics', () => {
      fm.define({ name: 'flag-a', description: '', enabled: true })
      fm.define({ name: 'flag-b', description: '', enabled: false })
      const list = fm.list()
      expect(list).toHaveLength(2)
      expect(list[0]).not.toHaveProperty('analytics')
    })

    it('listWithAnalytics includes analytics', () => {
      fm.define({ name: 'tracked', description: '', enabled: true })
      fm.isEnabled('tracked')
      const list = fm.listWithAnalytics()
      expect(list[0].analytics.checks).toBeGreaterThanOrEqual(1)
    })
  })

  describe('update', () => {
    it('updates flag properties', () => {
      fm.define({ name: 'flag', description: 'old', enabled: false })
      fm.update('flag', { description: 'new', enabled: true })
      const f = fm.list()[0]
      expect(f.description).toBe('new')
      expect(f.enabled).toBe(true)
    })

    it('throws for unknown flag', () => {
      expect(() => fm.update('missing', { enabled: true })).toThrow('not found')
    })
  })

  describe('track', () => {
    it('increments analytics', () => {
      fm.define({ name: 'tracked', description: '', enabled: true })
      fm.track('tracked')
      fm.track('tracked')
      expect(fm.listWithAnalytics()[0].analytics.checks).toBe(2)
    })

    it('does not throw for unknown flag', () => {
      expect(() => fm.track('missing')).not.toThrow()
    })
  })

  describe('singleton', () => {
    it('FlagManager.instance returns same instance', () => {
      const a = FlagManager.instance
      const b = FlagManager.instance
      expect(a).toBe(b)
    })
  })
})

describe('FeatureFlags', () => {
  let ff: FeatureFlags

  beforeEach(() => {
    ff = new FeatureFlags()
  })

  describe('define / is', () => {
    it('define stores disabled flag by default', () => {
      ff.define('flag')
      expect(ff.is('flag')).toBe(false)
    })

    it('define stores enabled flag', () => {
      ff.define('flag', true)
      expect(ff.is('flag')).toBe(true)
    })

    it('is returns false for undefined flag', () => {
      expect(ff.is('nope')).toBe(false)
    })
  })

  describe('defineWithResolver', () => {
    it('uses resolver function', () => {
      ff.defineWithResolver('admin', (user) => user?.id === 'admin-1')
      expect(ff.is('admin', { id: 'admin-1' })).toBe(true)
      expect(ff.is('admin', { id: 'user-1' })).toBe(false)
    })
  })

  describe('enable / disable', () => {
    it('enable toggles flag on', () => {
      ff.define('feature', false)
      ff.enable('feature')
      expect(ff.is('feature')).toBe(true)
    })

    it('disable toggles flag off', () => {
      ff.define('feature', true)
      ff.disable('feature')
      expect(ff.is('feature')).toBe(false)
    })
  })

  describe('all', () => {
    it('returns all flag names', () => {
      ff.define('a')
      ff.define('b')
      ff.define('c', true)
      expect(ff.all()).toEqual(['a', 'b', 'c'])
    })
  })

  describe('percentage', () => {
    it('returns false for undefined flag', () => {
      expect(ff.percentage('nope', 1)).toBe(false)
    })

    it('returns true when random < percent', () => {
      ff.define('test')
      vi.spyOn(Math, 'random').mockReturnValue(0.3)
      expect(ff.percentage('test', 0.5)).toBe(true)
      vi.restoreAllMocks()
    })

    it('returns false when random >= percent', () => {
      ff.define('test')
      vi.spyOn(Math, 'random').mockReturnValue(0.7)
      expect(ff.percentage('test', 0.5)).toBe(false)
      vi.restoreAllMocks()
    })
  })
})
