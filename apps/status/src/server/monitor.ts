import type { Db } from './db'
import type { Env } from './env'
import type { CheckRow, DailyRollupRow, EndpointRow, ProbeKind } from './types'

import { db as drizzleDb } from '@platform/db/connection'
import { statusChecks } from '@platform/db/schema'
import { and, gte, lt } from 'drizzle-orm'

type InternetState = {
  checkedAtMs: number
  ok: boolean
}

const sleep = async ({ ms }: { ms: number }) => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const clampErrorMessage = ({ message }: { message: string }) => {
  if (message.length <= 500) return message
  return `${message.slice(0, 500)}…`
}

const getDayStartUtcMs = ({ atMs }: { atMs: number }) => {
  const d = new Date(atMs)
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

const p95 = ({ values }: { values: number[] }) => {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.ceil(0.95 * sorted.length) - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? null
}

const toErrorKind = ({ error }: { error: unknown }) => {
  if (error instanceof DOMException && error.name === 'AbortError')
    return 'timeout'
  if (error instanceof Error) return 'fetch_error'
  return 'unknown'
}

type ProbeResult = {
  degraded: boolean
  errorKind: null | string
  errorMessage: null | string
  latencyMs: null | number
  ok: boolean
  statusCode: null | number
}

const probeUrl = async ({
  headers,
  method,
  timeoutMs,
  url,
}: {
  headers: HeadersInit
  method: 'GET' | 'HEAD'
  timeoutMs: number
  url: string
}): Promise<ProbeResult> => {
  const startedAt = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const res = await fetch(url, {
      cache: 'no-store',
      headers,
      method,
      signal: controller.signal,
    })

    void res.body?.cancel()

    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt))
    return {
      degraded: false,
      errorKind: null,
      errorMessage: null,
      latencyMs,
      ok: true,
      statusCode: res.status,
    }
  } catch (error) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt))

    return {
      degraded: false,
      errorKind: toErrorKind({ error }),
      errorMessage:
        error instanceof Error
          ? clampErrorMessage({ message: error.message })
          : 'Unknown error',
      latencyMs,
      ok: false,
      statusCode: null,
    }
  } finally {
    clearTimeout(timer)
  }
}

const resolveEndpointProbeTarget = ({
  endpoint,
  env,
  probe,
}: {
  endpoint: EndpointRow
  env: Env
  probe: ProbeKind
}) => {
  if (probe === 'public') {
    if (endpoint.publicUrl === null) return null
    const headers: Record<string, string> = {}
    return {
      headers,
      url: endpoint.publicUrl,
    }
  }

  if (endpoint.internalMode === 'directUrl') {
    if (endpoint.internalUrl === null) return null
    const headers: Record<string, string> = {}
    return {
      headers,
      url: endpoint.internalUrl,
    }
  }

  const host = endpoint.internalHost
  if (host === null) return null

  const base = new URL(env.internalTraefikBaseUrl)
  base.pathname = endpoint.internalPath
  base.search = ''
  base.hash = ''

  return {
    headers: {
      host,
    },
    url: base.toString(),
  }
}

const isExpectedStatus = ({
  expectedStatusMax,
  expectedStatusMin,
  status,
}: {
  expectedStatusMax: number
  expectedStatusMin: number
  status: number
}) => {
  return status >= expectedStatusMin && status <= expectedStatusMax
}

const computeDayRollup = ({
  dayStartMs,
  endpointId,
  probe,
  rows,
}: {
  dayStartMs: number
  endpointId: string
  probe: ProbeKind
  rows: { degraded: 0 | 1; latencyMs: null | number; ok: 0 | 1 }[]
}): DailyRollupRow => {
  const total = rows.length
  const up = rows.filter((r) => r.ok === 1).length
  const degraded = rows.filter((r) => r.ok === 1 && r.degraded === 1).length
  const down = total - up

  const okLatencies = rows
    .filter((r) => r.ok === 1 && typeof r.latencyMs === 'number')
    .map((r) => r.latencyMs)
    .filter((v): v is number => typeof v === 'number')

  const avgLatencyMs =
    okLatencies.length === 0
      ? null
      : okLatencies.reduce((acc, v) => acc + v, 0) / okLatencies.length

  return {
    avgLatencyMs:
      avgLatencyMs === null ? null : Number(avgLatencyMs.toFixed(2)),
    dayStartMs,
    degraded,
    down,
    endpointId,
    p95LatencyMs: p95({ values: okLatencies }),
    probe,
    total,
    up,
  }
}

const getAdminSafeNowMs = () => Date.now()

export const startMonitoring = ({ db, env }: { db: Db; env: Env }) => {
  const state: {
    endpoints: EndpointRow[]
    internet: InternetState | null
    nextRunAtByEndpointId: Map<string, number>
  } = {
    endpoints: [],
    internet: null,
    nextRunAtByEndpointId: new Map(),
  }

  const refreshEndpoints = async () => {
    const endpoints = await db.listActiveEndpoints()
    state.endpoints = endpoints

    for (const e of endpoints) {
      if (!state.nextRunAtByEndpointId.has(e.id)) {
        state.nextRunAtByEndpointId.set(e.id, 0)
      }
    }
  }

  const runInternetProbe = async ({ nowMs }: { nowMs: number }) => {
    const last = state.internet
    const isDue =
      last === null ||
      nowMs - last.checkedAtMs >= env.internetIntervalSec * 1000
    if (!isDue) return last

    const result = await probeUrl({
      headers: {},
      method: 'HEAD',
      timeoutMs: 3000,
      url: env.internetCheckUrl,
    })

    const ok =
      result.ok && result.statusCode !== null && result.statusCode < 500

    await db.insertInternetCheck({
      check: {
        atMs: nowMs,
        errorKind: result.errorKind,
        errorMessage: result.errorMessage,
        id: crypto.randomUUID(),
        latencyMs: result.latencyMs,
        ok: ok ? 1 : 0,
      },
    })

    const next = { checkedAtMs: nowMs, ok }
    state.internet = next
    return next
  }

  const runEndpointProbe = async ({
    endpoint,
    internetOk,
    nowMs,
    probe,
  }: {
    endpoint: EndpointRow
    internetOk: boolean
    nowMs: number
    probe: ProbeKind
  }) => {
    if (probe === 'public' && !internetOk) return

    const target = resolveEndpointProbeTarget({ endpoint, env, probe })
    if (!target) return

    const result = await probeUrl({
      headers: target.headers,
      method: endpoint.method,
      timeoutMs: endpoint.timeoutMs,
      url: target.url,
    })

    const ok =
      result.ok &&
      typeof result.statusCode === 'number' &&
      isExpectedStatus({
        expectedStatusMax: endpoint.expectedStatusMax,
        expectedStatusMin: endpoint.expectedStatusMin,
        status: result.statusCode,
      })

    const degraded =
      ok &&
      typeof result.latencyMs === 'number' &&
      result.latencyMs >= endpoint.degradedMs

    const check: CheckRow = {
      atMs: nowMs,
      degraded: degraded ? 1 : 0,
      endpointId: endpoint.id,
      errorKind: ok ? null : result.errorKind,
      errorMessage: ok ? null : result.errorMessage,
      id: crypto.randomUUID(),
      latencyMs: result.latencyMs,
      ok: ok ? 1 : 0,
      probe,
      statusCode: result.statusCode,
    }

    await db.insertCheck({ check })
  }

  const runMaintenance = async ({ nowMs }: { nowMs: number }) => {
    const retentionMs = env.checksRetentionHours * 60 * 60 * 1000
    await db.deleteChecksBefore({ beforeMs: nowMs - retentionMs })

    const todayStart = getDayStartUtcMs({ atMs: nowMs })
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000

    const recomputeDay = async ({ dayStartMs }: { dayStartMs: number }) => {
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000
      const byKey = new Map<
        string,
        {
          endpointId: string
          probe: ProbeKind
          rows: { degraded: 0 | 1; latencyMs: null | number; ok: 0 | 1 }[]
        }
      >()

      const checkRows = await drizzleDb
        .select({
          degraded: statusChecks.degraded,
          endpointId: statusChecks.endpointId,
          latencyMs: statusChecks.latencyMs,
          ok: statusChecks.ok,
          probe: statusChecks.probe,
        })
        .from(statusChecks)
        .where(
          and(
            gte(statusChecks.checkedAt, new Date(dayStartMs)),
            lt(statusChecks.checkedAt, new Date(dayEndMs)),
          ),
        )

      for (const r of checkRows) {
        const key = `${r.endpointId}:${r.probe}`
        const prev = byKey.get(key)
        const nextRows = prev?.rows ?? []
        const ok: 0 | 1 = r.ok ? 1 : 0
        const degraded: 0 | 1 = r.degraded ? 1 : 0
        nextRows.push({
          degraded,
          latencyMs: r.latencyMs,
          ok,
        })

        byKey.set(key, {
          endpointId: r.endpointId,
          probe: r.probe as ProbeKind,
          rows: nextRows,
        })
      }

      for (const entry of byKey.values()) {
        const rollup = computeDayRollup({
          dayStartMs,
          endpointId: entry.endpointId,
          probe: entry.probe,
          rows: entry.rows,
        })
        await db.upsertDailyRollup({ rollup })
      }
    }

    await recomputeDay({ dayStartMs: yesterdayStart })
    await recomputeDay({ dayStartMs: todayStart })
  }

  let isTickRunning = false
  const tick = async () => {
    if (isTickRunning) return
    isTickRunning = true
    try {
      const nowMs = getAdminSafeNowMs()
      const internet = await runInternetProbe({ nowMs })
      const internetOk = internet.ok

      for (const endpoint of state.endpoints) {
        const nextRunAt = state.nextRunAtByEndpointId.get(endpoint.id) ?? 0
        if (nowMs < nextRunAt) continue

        state.nextRunAtByEndpointId.set(
          endpoint.id,
          nowMs + endpoint.intervalSec * 1000,
        )

        await runEndpointProbe({
          endpoint,
          internetOk,
          nowMs,
          probe: 'internal',
        })

        await runEndpointProbe({
          endpoint,
          internetOk,
          nowMs,
          probe: 'public',
        })

        await sleep({ ms: 5 })
      }
    } finally {
      isTickRunning = false
    }
  }

  const start = () => {
    void refreshEndpoints()
    setInterval(() => {
      void refreshEndpoints()
    }, 30_000)

    tick().catch((error: unknown) => {
      void error
    })
    setInterval(() => {
      tick().catch((error: unknown) => {
        void error
      })
    }, 1_000)

    const runMaintenanceTick = () => {
      const nowMs = getAdminSafeNowMs()
      runMaintenance({ nowMs }).catch((error: unknown) => {
        void error
      })
    }
    runMaintenanceTick()
    setInterval(runMaintenanceTick, env.maintenanceIntervalSec * 1000)
  }

  start()
}
