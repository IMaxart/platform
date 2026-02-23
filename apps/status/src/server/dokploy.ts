import type { Db } from './db'
import type { Env } from './env'
import type { DokployRefType } from '~/shared/api-types'

const parseDateMs = ({ value }: { value: unknown }) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

const latestDeploymentMsFromList = ({ data }: { data: unknown }) => {
  if (!Array.isArray(data)) return null
  const objects = data.filter(
    (v): v is Record<string, unknown> => typeof v === 'object' && v !== null,
  )
  if (objects.length === 0) return null

  const candidates = objects.flatMap((obj) => {
    const createdAt = parseDateMs({ value: obj['createdAt'] })
    const startedAt = parseDateMs({ value: obj['startedAt'] })
    const finishedAt = parseDateMs({ value: obj['finishedAt'] })
    const updatedAt = parseDateMs({ value: obj['updatedAt'] })
    return [createdAt, startedAt, finishedAt, updatedAt].filter(
      (v): v is number => typeof v === 'number',
    )
  })

  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

const buildDeploymentsUrl = ({
  baseUrl,
  refId,
  type,
}: {
  baseUrl: string
  refId: string
  type: DokployRefType
}) => {
  const url = new URL(baseUrl)
  url.pathname =
    type === 'compose' ? '/api/deployment.allByCompose' : '/api/deployment.all'
  url.searchParams.set(
    type === 'compose' ? 'composeId' : 'applicationId',
    refId,
  )
  return url.toString()
}

const syncOnce = async ({
  db,
  env,
  nowMs,
}: {
  db: Db
  env: Env
  nowMs: number
}) => {
  if (!env.dokployBaseUrl || !env.dokployApiKey) return

  const services = db.listServices()
  for (const service of services) {
    const dokploy = db.getServiceDokploy({ serviceId: service.id })
    if (!dokploy) continue

    try {
      const url = buildDeploymentsUrl({
        baseUrl: env.dokployBaseUrl,
        refId: dokploy.refId,
        type: dokploy.type,
      })

      const res = await fetch(url, {
        headers: {
          'x-api-key': env.dokployApiKey,
        },
      })
      const data: unknown = await res.json().catch(() => null)

      const latestMs = latestDeploymentMsFromList({ data })
      const nextLastDeployedAtMs = latestMs ?? dokploy.lastDeployedAtMs ?? null

      db.updateServiceDokploySync({
        lastDeployedAtMs: nextLastDeployedAtMs,
        lastSyncAtMs: nowMs,
        serviceId: service.id,
      })
    } catch (error) {
      void error
    }
  }
}

export const startDokploySync = ({ db, env }: { db: Db; env: Env }) => {
  const enabled = Boolean(env.dokployBaseUrl && env.dokployApiKey)
  if (!enabled) return

  const run = () => {
    const nowMs = Date.now()
    syncOnce({ db, env, nowMs }).catch((error: unknown) => {
      void error
    })
  }

  run()
  setInterval(run, env.dokploySyncIntervalSec * 1000)
}
