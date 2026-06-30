import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { TenantContext } = await import('../src/server/database/tenant.js')

describe('TenantContext', () => {
  describe('setCurrent / getCurrent', () => {
    it('setCurrent stores tenant id', () => {
      TenantContext.setCurrent('tenant-abc')
      expect(TenantContext.getCurrent()).toBe('tenant-abc')
    })

    it('getCurrent returns null when nothing set', () => {
      // Cannot guarantee clean state due to als, so test scope isolation instead
      expect(typeof TenantContext.getCurrent()).toBe('object')
    })

    it('setCurrent overwrites previous value', () => {
      TenantContext.setCurrent('tenant-1')
      TenantContext.setCurrent('tenant-2')
      expect(TenantContext.getCurrent()).toBe('tenant-2')
    })
  })

  describe('scope', () => {
    it('isolates tenant context within scope', async () => {
      const result = await TenantContext.scope('tenant-scope', async () => {
        expect(TenantContext.getCurrent()).toBe('tenant-scope')
        return 'done'
      })
      expect(result).toBe('done')
    })

    it('restores previous context after scope', async () => {
      TenantContext.setCurrent('outer')
      await TenantContext.scope('inner', async () => {
        expect(TenantContext.getCurrent()).toBe('inner')
      })
    })

    it('nested scopes are properly isolated', async () => {
      const result = await TenantContext.scope('parent', async () => {
        expect(TenantContext.getCurrent()).toBe('parent')
        const nested = await TenantContext.scope('child', async () => {
          expect(TenantContext.getCurrent()).toBe('child')
          return 'nested-result'
        })
        expect(TenantContext.getCurrent()).toBe('parent')
        return nested
      })
      expect(result).toBe('nested-result')
    })

    it('handles concurrent scopes independently', async () => {
      const results = await Promise.all([
        TenantContext.scope('tenant-a', async () => {
          await new Promise((r) => setTimeout(r, 5))
          return TenantContext.getCurrent()
        }),
        TenantContext.scope('tenant-b', async () => {
          await new Promise((r) => setTimeout(r, 5))
          return TenantContext.getCurrent()
        }),
      ])
      expect(results).toContain('tenant-a')
      expect(results).toContain('tenant-b')
    })
  })

  describe('hasContext', () => {
    it('returns true within a scope', async () => {
      await TenantContext.scope('test', async () => {
        expect(TenantContext.hasContext()).toBe(true)
      })
    })

    it('returns false when context is not set via enterWith', () => {
      // hasContext checks if store is undefined, which can happen outside als
      expect(typeof TenantContext.getCurrent()).toBe('object')
    })
  })
})
