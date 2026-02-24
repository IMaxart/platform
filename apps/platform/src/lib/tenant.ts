import { db } from '@platform/db'
import { services } from '@platform/db/schema'
import { eq } from 'drizzle-orm'

const ADMIN_DOMAIN = process.env['ADMIN_DOMAIN'] ?? 'localhost'

export type TenantInfo = {
  isAdmin: boolean
  serviceId: null | string
}

export const resolveTenant = async (host: string): Promise<TenantInfo> => {
  const normalizedHost = host.replace(/:\d+$/, '')

  const adminNormalized = ADMIN_DOMAIN.replace(/:\d+$/, '')
  if (normalizedHost === adminNormalized || normalizedHost === 'localhost') {
    return { isAdmin: true, serviceId: null }
  }

  const service = await db.query.services.findFirst({
    columns: { id: true },
    where: eq(services.domain, normalizedHost),
  })

  if (service) {
    return { isAdmin: false, serviceId: service.id }
  }

  return { isAdmin: false, serviceId: null }
}
