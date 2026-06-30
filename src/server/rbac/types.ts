export type Permission = string

export interface Role {
  id: string
  name: string
  label: string
  description: string | null
  isSystem: boolean
  permissions: Permission[]
  createdAt: Date
  updatedAt: Date
}

export interface RBACUser {
  id: string
  roles: string[]
  permissions: string[]
}

export interface CheckOptions {
  requireAll?: boolean
}

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
}
