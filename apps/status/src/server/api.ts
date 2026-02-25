import type { Db } from './db'
import type { CheckState, ProbeKind } from './types'
import type { PublicPageResponse } from '~/shared/api-types'

import { db as drizzleDb } from '@platform/db/connection'
import {
  statusChecks,
  statusEndpoints,
  statusRollupsDaily,
} from '@platform/db/schema'
import { and, eq, gte, sql as rawSql, sum } from 'drizzle-orm'

const json = (body: unknown, init?: ResponseInit) => {
  return Response.json(body, init)
}

const getRequestHost = ({ req }: { req: Request }) => {
  const forwarded = req.headers.get('x-forwarded-host')
  const host = forwarded ?? req.headers.get('host')
  return host?.split(',')[0]?.trim() ?? null
}

const endpointStateFromLatest = ({
  latest,
}: {
  latest: null | { degraded: 0 | 1; ok: 0 | 1 }
}): CheckState => {
  if (!latest) return 'UNKNOWN'
  if (latest.ok === 0) return 'DOWN'
  if (latest.degraded === 1) return 'DEGRADED'
  return 'UP'
}

const serviceStateFromEndpoints = ({
  endpointStates,
}: {
  endpointStates: CheckState[]
}): CheckState => {
  if (endpointStates.includes('DOWN')) return 'DOWN'
  if (endpointStates.includes('DEGRADED')) return 'DEGRADED'
  if (endpointStates.includes('UP')) return 'UP'
  return 'UNKNOWN'
}

type PublicModeResponse = Extract<PublicPageResponse, { mode: 'public' }>

const getUptimePercent = ({ total, up }: { total: number; up: number }) => {
  if (total === 0) return null
  return Number(((up / total) * 100).toFixed(3))
}

const computeUptimeFromChecks = async ({
  endpointId,
  probe,
  sinceMs,
}: {
  endpointId: string
  probe: ProbeKind
  sinceMs: number
}) => {
  const rows = await drizzleDb
    .select({
      total: rawSql<number>`count(*)`.as('total'),
      up: rawSql<number>`sum(case when ${statusChecks.ok} = true then 1 else 0 end)`.as(
        'up',
      ),
    })
    .from(statusChecks)
    .where(
      and(
        eq(statusChecks.endpointId, endpointId),
        eq(statusChecks.probe, probe),
        gte(statusChecks.checkedAt, new Date(sinceMs)),
      ),
    )

  const row = rows[0]
  if (!row) return null
  return getUptimePercent({ total: row.total, up: row.up })
}

const computeUptimeFromDailyRollups = async ({
  db,
  endpointId,
  probe,
  sinceMs,
}: {
  db: Db
  endpointId: string
  probe: ProbeKind
  sinceMs: number
}) => {
  const rollups = await db.getDailyRollups({ endpointId, probe, sinceMs })
  const total = rollups.reduce((acc, r) => acc + r.total, 0)
  const up = rollups.reduce((acc, r) => acc + r.up, 0)
  return getUptimePercent({ total, up })
}

const computeServiceUptimeFromChecks = async ({
  probe,
  serviceId,
  sinceMs,
}: {
  probe: ProbeKind
  serviceId: string
  sinceMs: number
}) => {
  const rows = await drizzleDb
    .select({
      total: rawSql<number>`count(*)`.as('total'),
      up: rawSql<number>`sum(case when ${statusChecks.ok} = true then 1 else 0 end)`.as(
        'up',
      ),
    })
    .from(statusChecks)
    .innerJoin(statusEndpoints, eq(statusEndpoints.id, statusChecks.endpointId))
    .where(
      and(
        eq(statusEndpoints.serviceId, serviceId),
        eq(statusChecks.probe, probe),
        gte(statusChecks.checkedAt, new Date(sinceMs)),
      ),
    )

  const row = rows[0]
  if (!row) return null
  return getUptimePercent({ total: row.total, up: row.up })
}

const computeServiceUptimeFromDailyRollups = async ({
  probe,
  serviceId,
  sinceMs,
}: {
  probe: ProbeKind
  serviceId: string
  sinceMs: number
}) => {
  const rows = await drizzleDb
    .select({
      total: sum(statusRollupsDaily.total).as('total'),
      up: sum(statusRollupsDaily.up).as('up'),
    })
    .from(statusRollupsDaily)
    .innerJoin(
      statusEndpoints,
      eq(statusEndpoints.id, statusRollupsDaily.endpointId),
    )
    .where(
      and(
        eq(statusEndpoints.serviceId, serviceId),
        eq(statusRollupsDaily.probe, probe),
        gte(statusRollupsDaily.dayStart, new Date(sinceMs)),
      ),
    )

  const row = rows[0]
  if (!row) return null
  return getUptimePercent({
    total: Number(row.total) || 0,
    up: Number(row.up) || 0,
  })
}

export const handleApiRequest = async ({
  db,
  req,
}: {
  db: Db
  req: Request
}): Promise<Response> => {
  try {
    const url = new URL(req.url)
    const host = getRequestHost({ req })
    if (host === null)
      return json({ error: 'Missing Host header' }, { status: 400 })

    if (url.pathname === '/api/public/page' && req.method === 'GET') {
      const service = await db.getServiceByPublicHost({ host })
      if (!service) {
        const resp: PublicPageResponse = {
          host,
          mode: 'notFound',
        }
        return json(resp, { status: 404 })
      }

      const allEndpoints = await db.listEndpointsByServiceId({
        serviceId: service.id,
      })
      const endpoints = allEndpoints.filter((e) => e.enabled === 1)

      const nowMs = Date.now()
      const since24hMs = nowMs - 24 * 60 * 60 * 1000
      const since90dMs = nowMs - 90 * 24 * 60 * 60 * 1000
      const since365dMs = nowMs - 365 * 24 * 60 * 60 * 1000

      const checks24hEntries = await Promise.all(
        endpoints.map(async (e) => {
          const checks = await db.listChecksSince({
            endpointId: e.id,
            probe: 'internal',
            sinceMs: since24hMs,
          })
          return [
            e.id,
            checks.map((c) => ({
              atMs: c.atMs,
              degraded: c.degraded,
              latencyMs: c.latencyMs,
              ok: c.ok,
            })),
          ] as const
        }),
      )
      const checks24hByEndpointId: PublicModeResponse['checks24hByEndpointId'] =
        Object.fromEntries(checks24hEntries)

      const endpointsWithStatus = await Promise.all(
        endpoints.map(async (e) => {
          const latest = await db.getLatestCheck({
            endpointId: e.id,
            probe: 'internal',
          })
          const state = endpointStateFromLatest({ latest })

          const uptimeLast24h = await computeUptimeFromChecks({
            endpointId: e.id,
            probe: 'internal',
            sinceMs: since24hMs,
          })
          const uptimeLast90d = await computeUptimeFromDailyRollups({
            db,
            endpointId: e.id,
            probe: 'internal',
            sinceMs: since90dMs,
          })
          const uptimeLast365d = await computeUptimeFromDailyRollups({
            db,
            endpointId: e.id,
            probe: 'internal',
            sinceMs: since365dMs,
          })

          return {
            ...e,
            latest: latest
              ? {
                  atMs: latest.atMs,
                  errorKind: latest.errorKind,
                  latencyMs: latest.latencyMs,
                  state,
                  statusCode: latest.statusCode,
                }
              : null,
            uptime: {
              last24h: uptimeLast24h,
              last90d: uptimeLast90d,
              last365d: uptimeLast365d,
            },
          }
        }),
      )

      const endpointStates = endpointsWithStatus.map(
        (e) => e.latest?.state ?? 'UNKNOWN',
      )
      const serviceState = serviceStateFromEndpoints({ endpointStates })

      const serviceUptime24h = await computeServiceUptimeFromChecks({
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since24hMs,
      })
      const serviceUptime90d = await computeServiceUptimeFromDailyRollups({
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since90dMs,
      })
      const serviceUptime365d = await computeServiceUptimeFromDailyRollups({
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since365dMs,
      })

      const deploy = await (async () => {
        const row = await db.getServiceDokploy({ serviceId: service.id })
        if (!row) return null
        return { lastDeployedAtMs: row.lastDeployedAtMs }
      })()

      const resp: PublicPageResponse = {
        checks24hByEndpointId,
        deploy,
        endpoints: endpointsWithStatus,
        host,
        mode: 'public',
        nowMs,
        service,
        serviceState,
        serviceUptime: {
          last24h: serviceUptime24h,
          last90d: serviceUptime90d,
          last365d: serviceUptime365d,
        },
      }

      return json(resp)
    }

    return json({ error: 'Not found' }, { status: 404 })
  } catch (error) {
    console.error('API handler error', error)

    const message = error instanceof Error ? error.message : 'Unknown error'

    return json(
      {
        detail: message,
        error: 'Internal server error',
      },
      { status: 500 },
    )
  }
}
