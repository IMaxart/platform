import { db } from '@platform/db'
import { projects } from '@platform/db/schema'
import { eq } from 'drizzle-orm'

const ADMIN_DOMAIN = process.env['ADMIN_DOMAIN'] ?? 'localhost'

export type TenantInfo = {
  isAdmin: boolean
  projectId: null | string
}

/** Resolves tenant from host: admin domain, analytics subdomain, or custom domain. @param host - Request Host header (may include port). @returns TenantInfo with isAdmin flag and projectId when matched. */
export const resolveTenant = async (host: string): Promise<TenantInfo> => {
  const normalizedHost = host.replace(/:\d+$/, '')

  const adminNormalized = ADMIN_DOMAIN.replace(/:\d+$/, '')
  if (normalizedHost === adminNormalized || normalizedHost === 'localhost') {
    return { isAdmin: true, projectId: null }
  }

  const project = await db.query.projects.findFirst({
    columns: { id: true },
    where: eq(projects.analyticsSubdomain, host),
  })

  if (project) {
    return { isAdmin: false, projectId: project.id }
  }

  const projectByDomain = await db.query.projects.findFirst({
    columns: { id: true },
    where: eq(projects.domain, normalizedHost),
  })

  if (projectByDomain) {
    return { isAdmin: false, projectId: projectByDomain.id }
  }

  return { isAdmin: false, projectId: null }
}
