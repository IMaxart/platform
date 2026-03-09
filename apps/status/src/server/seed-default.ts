import { db as drizzleDb } from '@platform/db/connection'
import { projects } from '@platform/db/schema'

import type { Db } from './db'
import type { Env } from './env'
import type { EndpointRow } from './types'

const PROJECT_ID = '00000000-0000-0000-0000-000000000000'
const SERVICE_ID = '00000000-0000-0000-0000-000000000001'

const ENDPOINT_IDS = {
  database: '00000000-0000-0000-0000-000000000012',
  platform: '00000000-0000-0000-0000-000000000011',
  status: '00000000-0000-0000-0000-000000000010',
} as const

const ensureProject = async () => {
  await drizzleDb
    .insert(projects)
    .values({ id: PROJECT_ID, name: 'IMaxart Platform' })
    .onConflictDoNothing({ target: projects.id })
}

const buildEndpoint = ({
  displayName,
  id,
  internalHost,
  internalPath,
  key,
  publicLabel,
}: {
  displayName: string
  id: string
  internalHost: string
  internalPath: string
  key: string
  publicLabel: null | string
}): EndpointRow => ({
  createdAtMs: Date.now(),
  degradedMs: 2000,
  displayName,
  enabled: 1,
  expectedStatusMax: 299,
  expectedStatusMin: 200,
  id,
  internalHost,
  internalMode: 'traefikHost',
  internalPath,
  internalUrl: null,
  intervalSec: 30,
  key,
  method: 'GET',
  publicLabel,
  publicUrl: null,
  serviceId: SERVICE_ID,
  timeoutMs: 5000,
  warnMs: 1000,
})

export const seedDefaultService = async ({ db, env }: { db: Db; env: Env }) => {
  const domain = env.adminDomain

  const statusHost = `status.${domain}`
  const platformHost = `platform.${domain}`

  await ensureProject()

  await db.upsertService({
    service: {
      createdAtMs: Date.now(),
      enabled: 1,
      id: SERVICE_ID,
      name: 'IMaxart Platform',
      primaryDomain: platformHost,
      publicStatusHost: statusHost,
      slug: 'imaxart-platform',
    },
  })

  const endpoints = [
    buildEndpoint({
      displayName: 'Status',
      id: ENDPOINT_IDS.status,
      internalHost: statusHost,
      internalPath: '/health',
      key: 'status',
      publicLabel: statusHost,
    }),
    buildEndpoint({
      displayName: 'Platform',
      id: ENDPOINT_IDS.platform,
      internalHost: platformHost,
      internalPath: '/api/health',
      key: 'platform',
      publicLabel: platformHost,
    }),
    buildEndpoint({
      displayName: 'Database',
      id: ENDPOINT_IDS.database,
      internalHost: platformHost,
      internalPath: '/api/db-health',
      key: 'database',
      publicLabel: null,
    }),
  ]

  for (const endpoint of endpoints) {
    await db.upsertEndpoint({ endpoint })
  }

  console.log(
    `Default status service seeded for ${statusHost} (${String(endpoints.length)} endpoints)`,
  )
}
