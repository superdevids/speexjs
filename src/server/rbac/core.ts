import type { Role, CheckOptions, PermissionCheckResult } from './types.js'

export function hasPermission(
  userPermissions: string[],
  required: string | string[],
  options?: CheckOptions,
): boolean {
  if (userPermissions.includes('*')) return true
  if (typeof required === 'string') return userPermissions.includes(required)
  if (options?.requireAll) return required.every(p => userPermissions.includes(p))
  return required.some(p => userPermissions.includes(p))
}

export function hasRole(
  userRoles: string[],
  required: string | string[],
  options?: CheckOptions,
): boolean {
  if (typeof required === 'string') return userRoles.includes(required)
  if (options?.requireAll) return required.every(r => userRoles.includes(r))
  return required.some(r => userRoles.includes(r))
}

export function flattenPermissions(roles: Role[]): string[] {
  const permSet = new Set<string>()
  for (const role of roles) {
    if (role.permissions.includes('*')) return ['*']
    for (const p of role.permissions) permSet.add(p)
  }
  return [...permSet]
}

export function checkPermission(
  userPermissions: string[],
  required: string | string[],
  options?: CheckOptions,
): PermissionCheckResult {
  const allowed = hasPermission(userPermissions, required, options)
  return {
    allowed,
    reason: allowed ? undefined : `Missing required permission(s): ${Array.isArray(required) ? required.join(', ') : required}`,
  }
}

export function canAccessResource(
  userPermissions: string[],
  permission: string,
  resourceOwnerId?: string,
  userId?: string,
): boolean {
  if (userPermissions.includes('*') || userPermissions.includes(permission)) return true
  if (resourceOwnerId !== undefined && userId !== undefined && resourceOwnerId === userId) return true
  return false
}

export function getAccessibleResources(userPermissions: string[]): string[] {
  const resources = new Set<string>()
  for (const perm of userPermissions) {
    if (perm === '*') return ['*']
    const [resource] = perm.split(':')
    if (resource) resources.add(resource)
  }
  return [...resources]
}

export function canPerformAction(userPermissions: string[], resource: string, action: string): boolean {
  return hasPermission(userPermissions, `${resource}:${action}`)
}
