import { TenantContext } from '../database/tenant.js'
import type { Middleware } from './index.js'

export function tenant(): Middleware {
  return (ctx, next) => {
    const { request } = ctx

    let tenantId: string | null = null

    const host = request.headers.get('host') ?? ''
    const subdomain = host.split('.')[0]
    if (subdomain && subdomain !== 'www' && subdomain !== 'localhost') {
      tenantId = subdomain
    }

    const headerTenant = request.headers.get('x-tenant-id')
    if (headerTenant) {
      tenantId = headerTenant
    }

    const session = (ctx as unknown as Record<string, unknown>).session as Record<string, unknown> | undefined
    if (session && typeof session.tenant_id === 'string') {
      tenantId = session.tenant_id
    }

    if (tenantId) {
      TenantContext.setCurrent(tenantId)
    }

    return next()
  }
}
