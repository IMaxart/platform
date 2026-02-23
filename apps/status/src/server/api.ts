import type { Db } from './db'
import type { Env } from './env'
import type { CheckState, EndpointRow, ProbeKind, ServiceRow } from './types'
import type {
  AdminServicesResponse,
  DokployRefType,
  PublicPageResponse,
} from '~/shared/api-types'

import { named } from './sql'

const json = (body: unknown, init?: ResponseInit) => {
  return Response.json(body, init)
}

const getRequestHost = ({ req }: { req: Request }) => {
  const forwarded = req.headers.get('x-forwarded-host')
  const host = forwarded ?? req.headers.get('host')
  return host?.split(',')[0]?.trim() ?? null
}

const isLocalhostHost = ({ host }: { host: string }) => {
  return (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('0.0.0.0')
  )
}

const requireAdminToken = ({ env, req }: { env: Env; req: Request; }) => {
  const expected = env.adminWriteToken
  if (!expected)
    return { error: 'ADMIN_WRITE_TOKEN not configured' as const, ok: false }

  const provided = req.headers.get('x-admin-token')
  if (provided !== expected)
    return { error: 'Invalid admin token' as const, ok: false }

  return { ok: true as const }
}

const endpointStateFromLatest = ({
  latest,
}: {
  latest: null | { degraded: 0 | 1; ok: 0 | 1; }
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

const getUptimePercent = ({ total, up }: { total: number; up: number; }) => {
  if (total === 0) return null
  return Number(((up / total) * 100).toFixed(3))
}

const computeUptimeFromChecks = ({
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
  const stmt = db.sqlite.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN ok = 1 THEN 1 ELSE 0 END) as up
    FROM checks
    WHERE endpointId = $endpointId AND probe = $probe AND atMs >= $sinceMs
  `)
  const row = stmt.get(named({ endpointId, probe, sinceMs })) as null | {
    total: number
    up: number
  }
  if (!row) return null
  return getUptimePercent({ total: row.total ?? 0, up: row.up ?? 0 })
}

const computeUptimeFromDailyRollups = ({
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
  const rollups = db.getDailyRollups({ endpointId, probe, sinceMs })
  const total = rollups.reduce((acc, r) => acc + r.total, 0)
  const up = rollups.reduce((acc, r) => acc + r.up, 0)
  return getUptimePercent({ total, up })
}

const computeServiceUptimeFromChecks = ({
  db,
  probe,
  serviceId,
  sinceMs,
}: {
  db: Db
  probe: ProbeKind
  serviceId: string
  sinceMs: number
}) => {
  const stmt = db.sqlite.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN c.ok = 1 THEN 1 ELSE 0 END) as up
    FROM checks c
    JOIN endpoints e ON e.id = c.endpointId
    WHERE e.serviceId = $serviceId AND c.probe = $probe AND c.atMs >= $sinceMs
  `)

  const row = stmt.get(named({ probe, serviceId, sinceMs })) as null | {
    total: number
    up: number
  }
  if (!row) return null
  return getUptimePercent({ total: row.total ?? 0, up: row.up ?? 0 })
}

const computeServiceUptimeFromDailyRollups = ({
  db,
  probe,
  serviceId,
  sinceMs,
}: {
  db: Db
  probe: ProbeKind
  serviceId: string
  sinceMs: number
}) => {
  const stmt = db.sqlite.prepare(`
    SELECT
      SUM(r.total) as total,
      SUM(r.up) as up
    FROM rollups_daily r
    JOIN endpoints e ON e.id = r.endpointId
    WHERE e.serviceId = $serviceId AND r.probe = $probe AND r.dayStartMs >= $sinceMs
  `)
  const row = stmt.get(named({ probe, serviceId, sinceMs })) as null | {
    total: number
    up: number
  }
  if (!row) return null
  return getUptimePercent({ total: row.total ?? 0, up: row.up ?? 0 })
}

export const handleApiRequest = async ({
  db,
  env,
  req,
}: {
  db: Db
  env: Env
  req: Request
}): Promise<Response> => {
  try {
    const url = new URL(req.url)
    const host = getRequestHost({ req })
    if (!host) return json({ error: 'Missing Host header' }, { status: 400 })

    if (url.pathname === '/api/public/page' && req.method === 'GET') {
      const isAdminHost = host === env.adminHost || isLocalhostHost({ host })
      if (isAdminHost) {
        const resp: PublicPageResponse = {
          adminHost: env.adminHost,
          host,
          mode: 'admin',
        }
        return json(resp)
      }

      const service = db.getServiceByPublicHost({ host })
      if (!service) {
        const resp: PublicPageResponse = {
          adminHost: env.adminHost,
          host,
          mode: 'notFound',
        }
        return json(resp, { status: 404 })
      }

      const endpoints = db
        .listEndpointsByServiceId({ serviceId: service.id })
        .filter((e) => e.enabled === 1)

      const nowMs = Date.now()
      const since24hMs = nowMs - 24 * 60 * 60 * 1000
      const since90dMs = nowMs - 90 * 24 * 60 * 60 * 1000
      const since365dMs = nowMs - 365 * 24 * 60 * 60 * 1000

      const checks24hByEndpointId: PublicModeResponse['checks24hByEndpointId'] =
        Object.fromEntries(
          endpoints.map((e) => [
            e.id,
            db
              .listChecksSince({
                endpointId: e.id,
                probe: 'internal',
                sinceMs: since24hMs,
              })
              .map((c) => ({
                atMs: c.atMs,
                degraded: c.degraded,
                latencyMs: c.latencyMs,
                ok: c.ok,
              })),
          ]),
        )

      const endpointsWithStatus = endpoints.map((e) => {
        const latest = db.getLatestCheck({
          endpointId: e.id,
          probe: 'internal',
        })
        const state = endpointStateFromLatest({ latest })

        const uptimeLast24h = computeUptimeFromChecks({
          db,
          endpointId: e.id,
          probe: 'internal',
          sinceMs: since24hMs,
        })
        const uptimeLast90d = computeUptimeFromDailyRollups({
          db,
          endpointId: e.id,
          probe: 'internal',
          sinceMs: since90dMs,
        })
        const uptimeLast365d = computeUptimeFromDailyRollups({
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
      })

      const endpointStates = endpointsWithStatus.map(
        (e) => e.latest?.state ?? 'UNKNOWN',
      )
      const serviceState = serviceStateFromEndpoints({ endpointStates })

      const serviceUptime24h = computeServiceUptimeFromChecks({
        db,
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since24hMs,
      })
      const serviceUptime90d = computeServiceUptimeFromDailyRollups({
        db,
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since90dMs,
      })
      const serviceUptime365d = computeServiceUptimeFromDailyRollups({
        db,
        probe: 'internal',
        serviceId: service.id,
        sinceMs: since365dMs,
      })

      const resp: PublicPageResponse = {
        checks24hByEndpointId,
        deploy: (() => {
          const row = db.getServiceDokploy({ serviceId: service.id })
          if (!row) return null
          return { lastDeployedAtMs: row.lastDeployedAtMs }
        })(),
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

    if (url.pathname === '/api/admin/services' && req.method === 'GET') {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const resp: AdminServicesResponse = {
        services: db.listServices().map((s) => ({
          ...s,
          deploy: db.getServiceDokploy({ serviceId: s.id }),
          endpoints: db
            .listEndpointsByServiceId({ serviceId: s.id })
            .map((e) => {
              const latest = db.getLatestCheck({
                endpointId: e.id,
                probe: 'internal',
              })
              const state = endpointStateFromLatest({ latest })
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
              }
            }),
        })),
      }
      return json(resp)
    }

    if (url.pathname === '/api/admin/services' && req.method === 'POST') {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const body: unknown = await req.json().catch(() => null)
      if (!body || typeof body !== 'object')
        return json({ error: 'Invalid JSON body' }, { status: 400 })

      const parsed = body as Partial<{
        name: string
        primaryDomain: null | string
        publicStatusHost: string
        slug: string
      }>

      if (!parsed.slug || !parsed.name || !parsed.publicStatusHost) {
        return json(
          { error: 'slug, name, publicStatusHost are required' },
          { status: 400 },
        )
      }

      const service: ServiceRow = {
        createdAtMs: Date.now(),
        enabled: 1,
        id: crypto.randomUUID(),
        name: parsed.name,
        primaryDomain: parsed.primaryDomain ?? null,
        publicStatusHost: parsed.publicStatusHost,
        slug: parsed.slug,
      }
      db.upsertService({ service })
      return json({ service }, { status: 201 })
    }

    if (
      url.pathname.startsWith('/api/admin/services/') &&
      req.method === 'PATCH'
    ) {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const id = url.pathname.replace('/api/admin/services/', '')
      if (!id) return json({ error: 'Missing id' }, { status: 400 })

      const body: unknown = await req.json().catch(() => null)
      if (!body || typeof body !== 'object')
        return json({ error: 'Invalid JSON body' }, { status: 400 })
      const parsed = body as Partial<
        Pick<
          ServiceRow,
          'enabled' | 'name' | 'primaryDomain' | 'publicStatusHost' | 'slug'
        >
      >

      db.updateService({ id, patch: parsed })
      const service = db.getServiceById({ id })
      return json({ service })
    }

    if (url.pathname === '/api/admin/endpoints' && req.method === 'POST') {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const body: unknown = await req.json().catch(() => null)
      if (!body || typeof body !== 'object')
        return json({ error: 'Invalid JSON body' }, { status: 400 })

      const parsed = body as Partial<EndpointRow>
      if (
        !parsed.serviceId ||
        !parsed.key ||
        !parsed.displayName ||
        !parsed.internalMode
      ) {
        return json(
          { error: 'serviceId, key, displayName, internalMode are required' },
          { status: 400 },
        )
      }
      if (!parsed.internalPath) {
        return json({ error: 'internalPath is required' }, { status: 400 })
      }

      const endpoint: EndpointRow = {
        createdAtMs: Date.now(),
        degradedMs: parsed.degradedMs ?? 2000,
        displayName: parsed.displayName,
        enabled: parsed.enabled ?? 1,
        expectedStatusMax: parsed.expectedStatusMax ?? 399,
        expectedStatusMin: parsed.expectedStatusMin ?? 200,
        id: crypto.randomUUID(),
        internalHost: parsed.internalHost ?? null,
        internalMode: parsed.internalMode,
        internalPath: parsed.internalPath,
        internalUrl: parsed.internalUrl ?? null,
        intervalSec: parsed.intervalSec ?? 60,
        key: parsed.key,
        method: parsed.method ?? 'GET',
        publicUrl: parsed.publicUrl ?? null,
        serviceId: parsed.serviceId,
        timeoutMs: parsed.timeoutMs ?? 5000,
        warnMs: parsed.warnMs ?? 500,
      }

      db.upsertEndpoint({ endpoint })
      return json({ endpoint }, { status: 201 })
    }

    if (
      url.pathname.startsWith('/api/admin/services/') &&
      url.pathname.endsWith('/dokploy') &&
      req.method === 'PATCH'
    ) {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const serviceId = url.pathname
        .replace('/api/admin/services/', '')
        .replace('/dokploy', '')
      if (!serviceId)
        return json({ error: 'Missing serviceId' }, { status: 400 })

      const body: unknown = await req.json().catch(() => null)
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid JSON body' }, { status: 400 })
      }

      const parsed = body as Partial<{ refId: string; type: DokployRefType; }>
      if (!parsed.type || !parsed.refId) {
        return json({ error: 'type and refId are required' }, { status: 400 })
      }

      db.upsertServiceDokploy({
        refId: parsed.refId,
        serviceId,
        type: parsed.type,
      })

      return json({ ok: true })
    }

    if (
      url.pathname.startsWith('/api/admin/endpoints/') &&
      req.method === 'PATCH'
    ) {
      const auth = requireAdminToken({ env, req })
      if (!auth.ok) return json({ error: auth.error }, { status: 401 })

      const id = url.pathname.replace('/api/admin/endpoints/', '')
      if (!id) return json({ error: 'Missing id' }, { status: 400 })

      const body: unknown = await req.json().catch(() => null)
      if (!body || typeof body !== 'object')
        return json({ error: 'Invalid JSON body' }, { status: 400 })

      const parsed = body as Partial<EndpointRow>
      db.updateEndpoint({ id, patch: parsed })

      return json({ ok: true })
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
