const cache = new Map<string, { permissions: string[]; roles: string[]; cachedAt: number }>()
const TTL = parseInt(process.env.RBAC_CACHE_TTL ?? '300', 10) * 1000
const MAX_ENTRIES = 1000

export function getCachedPermissions(userId: string): { permissions: string[]; roles: string[] } | null {
  const entry = cache.get(userId)
  if (!entry || Date.now() - entry.cachedAt > TTL) {
    cache.delete(userId)
    return null
  }
  return { permissions: entry.permissions, roles: entry.roles }
}

export function setCache(userId: string, permissions: string[], roles: string[]): void {
  if (cache.size >= MAX_ENTRIES) {
    const firstKey = cache.keys().next().value
    if (firstKey) cache.delete(firstKey)
  }
  cache.set(userId, { permissions, roles, cachedAt: Date.now() })
}

export function invalidateUserCache(userId: string): void {
  cache.delete(userId)
}

export function invalidateAllCache(): void {
  cache.clear()
}

export function invalidateRoleCache(roleName: string): void {
  for (const [userId, entry] of cache) {
    if (entry.roles.includes(roleName)) cache.delete(userId)
  }
}
