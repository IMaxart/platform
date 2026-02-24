import type {
  CheckRow,
  DailyRollupRow,
  EndpointRow,
  InternetCheckRow,
  ProbeKind,
  ServiceRow,
} from './types'
import type { DokployRefType } from '~/shared/api-types'

import { db as drizzleDb } from '@platform/db/connection'
import {
  services,
  statusChecks,
  statusEndpoints,
  statusInternetChecks,
  statusRollupsDaily,
  statusServiceDokploy,
} from '@platform/db/schema'
import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'

const boolToInt = (value: boolean): 0 | 1 => (value ? 1 : 0)

const dateToMs = (value: Date): number => value.getTime()

const dateMaybeToMs = (value: Date | null): null | number =>
  value ? value.getTime() : null

const msToDate = (ms: number): Date => new Date(ms)

const toServiceRow = (row: typeof services.$inferSelect): ServiceRow => ({
  createdAtMs: dateToMs(row.createdAt),
  enabled: boolToInt(row.enabled),
  id: row.id,
  name: row.name,
  primaryDomain: row.primaryDomain,
  publicStatusHost: row.publicStatusHost,
  slug: row.slug,
})

const toEndpointRow = (
  row: typeof statusEndpoints.$inferSelect,
): EndpointRow => ({
  createdAtMs: dateToMs(row.createdAt),
  degradedMs: row.degradedMs,
  displayName: row.displayName,
  enabled: boolToInt(row.enabled),
  expectedStatusMax: row.expectedStatusMax,
  expectedStatusMin: row.expectedStatusMin,
  id: row.id,
  internalHost: row.internalHost,
  internalMode: row.internalMode as EndpointRow['internalMode'],
  internalPath: row.internalPath,
  internalUrl: row.internalUrl,
  intervalSec: row.intervalSec,
  key: row.key,
  method: row.method as EndpointRow['method'],
  publicUrl: row.publicUrl,
  serviceId: row.serviceId,
  timeoutMs: row.timeoutMs,
  warnMs: row.warnMs,
})

const toCheckRow = (row: typeof statusChecks.$inferSelect): CheckRow => ({
  atMs: dateToMs(row.checkedAt),
  degraded: boolToInt(row.degraded),
  endpointId: row.endpointId,
  errorKind: row.errorKind,
  errorMessage: row.errorMessage,
  id: row.id,
  latencyMs: row.latencyMs,
  ok: boolToInt(row.ok),
  probe: row.probe as ProbeKind,
  statusCode: row.statusCode,
})

const toInternetCheckRow = (
  row: typeof statusInternetChecks.$inferSelect,
): InternetCheckRow => ({
  atMs: dateToMs(row.checkedAt),
  errorKind: row.errorKind,
  errorMessage: row.errorMessage,
  id: row.id,
  latencyMs: row.latencyMs,
  ok: boolToInt(row.ok),
})

const toDailyRollupRow = (
  row: typeof statusRollupsDaily.$inferSelect,
): DailyRollupRow => ({
  avgLatencyMs: row.avgLatencyMs,
  dayStartMs: dateToMs(row.dayStart),
  degraded: row.degraded,
  down: row.down,
  endpointId: row.endpointId,
  p95LatencyMs: row.p95LatencyMs,
  probe: row.probe as ProbeKind,
  total: row.total,
  up: row.up,
})

export type Db = {
  deleteChecksBefore: (params: { beforeMs: number }) => Promise<void>
  getDailyRollups: (params: {
    endpointId: string
    probe: ProbeKind
    sinceMs: number
  }) => Promise<DailyRollupRow[]>
  getLatestCheck: (params: {
    endpointId: string
    probe: ProbeKind
  }) => Promise<CheckRow | null>
  getLatestInternetCheck: () => Promise<InternetCheckRow | null>
  getServiceById: (params: { id: string }) => Promise<null | ServiceRow>
  getServiceByPublicHost: (params: {
    host: string
  }) => Promise<null | ServiceRow>
  getServiceDokploy: (params: { serviceId: string }) => Promise<null | {
    lastDeployedAtMs: null | number
    lastSyncAtMs: number
    refId: string
    serviceId: string
    type: DokployRefType
  }>
  insertCheck: (params: { check: CheckRow }) => Promise<void>
  insertInternetCheck: (params: { check: InternetCheckRow }) => Promise<void>
  listActiveEndpoints: () => Promise<EndpointRow[]>
  listChecksSince: (params: {
    endpointId: string
    probe: ProbeKind
    sinceMs: number
  }) => Promise<CheckRow[]>
  listEndpointsByServiceId: (params: {
    serviceId: string
  }) => Promise<EndpointRow[]>
  listServices: () => Promise<ServiceRow[]>
  updateEndpoint: (params: {
    id: string
    patch: Partial<EndpointRow>
  }) => Promise<void>
  updateService: (params: {
    id: string
    patch: Partial<
      Pick<
        ServiceRow,
        'enabled' | 'name' | 'primaryDomain' | 'publicStatusHost' | 'slug'
      >
    >
  }) => Promise<void>
  updateServiceDokploySync: (params: {
    lastDeployedAtMs: null | number
    lastSyncAtMs: number
    serviceId: string
  }) => Promise<void>
  upsertDailyRollup: (params: { rollup: DailyRollupRow }) => Promise<void>
  upsertEndpoint: (params: { endpoint: EndpointRow }) => Promise<void>
  upsertService: (params: {
    service: {
      createdAtMs: number
      enabled: 0 | 1
      id: string
      name: string
      primaryDomain: null | string
      publicStatusHost: string
      slug: string
    }
  }) => Promise<void>
  upsertServiceDokploy: (params: {
    refId: string
    serviceId: string
    type: DokployRefType
  }) => Promise<void>
}

export const createDb = (): Db => {
  const listServices: Db['listServices'] = async () => {
    const rows = await drizzleDb
      .select()
      .from(services)
      .orderBy(asc(services.name))

    return rows.map(toServiceRow)
  }

  const getServiceById: Db['getServiceById'] = async ({ id }) => {
    const rows = await drizzleDb
      .select()
      .from(services)
      .where(eq(services.id, id))
      .limit(1)

    return rows[0] ? toServiceRow(rows[0]) : null
  }

  const getServiceByPublicHost: Db['getServiceByPublicHost'] = async ({
    host,
  }) => {
    const rows = await drizzleDb
      .select()
      .from(services)
      .where(
        and(eq(services.publicStatusHost, host), eq(services.enabled, true)),
      )
      .limit(1)

    return rows[0] ? toServiceRow(rows[0]) : null
  }

  const upsertService: Db['upsertService'] = async ({ service }) => {
    await drizzleDb
      .insert(services)
      .values({
        createdAt: msToDate(service.createdAtMs),
        enabled: service.enabled === 1,
        id: service.id,
        name: service.name,
        primaryDomain: service.primaryDomain,
        projectId: '00000000-0000-0000-0000-000000000000',
        publicStatusHost: service.publicStatusHost,
        slug: service.slug,
      })
      .onConflictDoUpdate({
        set: {
          enabled: service.enabled === 1,
          name: service.name,
          primaryDomain: service.primaryDomain,
          publicStatusHost: service.publicStatusHost,
          slug: service.slug,
        },
        target: services.id,
      })
  }

  const updateService: Db['updateService'] = async ({ id, patch }) => {
    const set: Record<string, unknown> = {}
    if (patch.slug !== undefined) set['slug'] = patch.slug
    if (patch.name !== undefined) set['name'] = patch.name
    if (patch.primaryDomain !== undefined)
      set['primaryDomain'] = patch.primaryDomain
    if (patch.publicStatusHost !== undefined)
      set['publicStatusHost'] = patch.publicStatusHost
    if (patch.enabled !== undefined) set['enabled'] = patch.enabled === 1

    if (Object.keys(set).length === 0) return

    await drizzleDb.update(services).set(set).where(eq(services.id, id))
  }

  const listEndpointsByServiceId: Db['listEndpointsByServiceId'] = async ({
    serviceId,
  }) => {
    const rows = await drizzleDb
      .select()
      .from(statusEndpoints)
      .where(eq(statusEndpoints.serviceId, serviceId))
      .orderBy(asc(statusEndpoints.key))

    return rows.map(toEndpointRow)
  }

  const listActiveEndpoints: Db['listActiveEndpoints'] = async () => {
    const rows = await drizzleDb
      .select()
      .from(statusEndpoints)
      .where(eq(statusEndpoints.enabled, true))
      .orderBy(asc(statusEndpoints.serviceId), asc(statusEndpoints.key))

    return rows.map(toEndpointRow)
  }

  const upsertEndpoint: Db['upsertEndpoint'] = async ({ endpoint }) => {
    await drizzleDb
      .insert(statusEndpoints)
      .values({
        createdAt: msToDate(endpoint.createdAtMs),
        degradedMs: endpoint.degradedMs,
        displayName: endpoint.displayName,
        enabled: endpoint.enabled === 1,
        expectedStatusMax: endpoint.expectedStatusMax,
        expectedStatusMin: endpoint.expectedStatusMin,
        id: endpoint.id,
        internalHost: endpoint.internalHost,
        internalMode: endpoint.internalMode,
        internalPath: endpoint.internalPath,
        internalUrl: endpoint.internalUrl,
        intervalSec: endpoint.intervalSec,
        key: endpoint.key,
        method: endpoint.method,
        publicUrl: endpoint.publicUrl,
        serviceId: endpoint.serviceId,
        timeoutMs: endpoint.timeoutMs,
        warnMs: endpoint.warnMs,
      })
      .onConflictDoUpdate({
        set: {
          degradedMs: endpoint.degradedMs,
          displayName: endpoint.displayName,
          enabled: endpoint.enabled === 1,
          expectedStatusMax: endpoint.expectedStatusMax,
          expectedStatusMin: endpoint.expectedStatusMin,
          internalHost: endpoint.internalHost,
          internalMode: endpoint.internalMode,
          internalPath: endpoint.internalPath,
          internalUrl: endpoint.internalUrl,
          intervalSec: endpoint.intervalSec,
          key: endpoint.key,
          method: endpoint.method,
          publicUrl: endpoint.publicUrl,
          timeoutMs: endpoint.timeoutMs,
          warnMs: endpoint.warnMs,
        },
        target: statusEndpoints.id,
      })
  }

  const updateEndpoint: Db['updateEndpoint'] = async ({ id, patch }) => {
    const set: Record<string, unknown> = {}
    if (patch.serviceId !== undefined) set['serviceId'] = patch.serviceId
    if (patch.key !== undefined) set['key'] = patch.key
    if (patch.displayName !== undefined) set['displayName'] = patch.displayName
    if (patch.internalMode !== undefined)
      set['internalMode'] = patch.internalMode
    if (patch.internalUrl !== undefined) set['internalUrl'] = patch.internalUrl
    if (patch.internalHost !== undefined)
      set['internalHost'] = patch.internalHost
    if (patch.internalPath !== undefined)
      set['internalPath'] = patch.internalPath
    if (patch.publicUrl !== undefined) set['publicUrl'] = patch.publicUrl
    if (patch.method !== undefined) set['method'] = patch.method
    if (patch.intervalSec !== undefined) set['intervalSec'] = patch.intervalSec
    if (patch.timeoutMs !== undefined) set['timeoutMs'] = patch.timeoutMs
    if (patch.warnMs !== undefined) set['warnMs'] = patch.warnMs
    if (patch.degradedMs !== undefined) set['degradedMs'] = patch.degradedMs
    if (patch.expectedStatusMin !== undefined)
      set['expectedStatusMin'] = patch.expectedStatusMin
    if (patch.expectedStatusMax !== undefined)
      set['expectedStatusMax'] = patch.expectedStatusMax
    if (patch.enabled !== undefined) set['enabled'] = patch.enabled === 1

    if (Object.keys(set).length === 0) return

    await drizzleDb
      .update(statusEndpoints)
      .set(set)
      .where(eq(statusEndpoints.id, id))
  }

  const insertCheck: Db['insertCheck'] = async ({ check }) => {
    await drizzleDb.insert(statusChecks).values({
      checkedAt: msToDate(check.atMs),
      degraded: check.degraded === 1,
      endpointId: check.endpointId,
      errorKind: check.errorKind,
      errorMessage: check.errorMessage,
      id: check.id,
      latencyMs: check.latencyMs,
      ok: check.ok === 1,
      probe: check.probe,
      statusCode: check.statusCode,
    })
  }

  const insertInternetCheck: Db['insertInternetCheck'] = async ({ check }) => {
    await drizzleDb.insert(statusInternetChecks).values({
      checkedAt: msToDate(check.atMs),
      errorKind: check.errorKind,
      errorMessage: check.errorMessage,
      id: check.id,
      latencyMs: check.latencyMs,
      ok: check.ok === 1,
    })
  }

  const getLatestInternetCheck: Db['getLatestInternetCheck'] = async () => {
    const rows = await drizzleDb
      .select()
      .from(statusInternetChecks)
      .orderBy(desc(statusInternetChecks.checkedAt))
      .limit(1)

    return rows[0] ? toInternetCheckRow(rows[0]) : null
  }

  const getLatestCheck: Db['getLatestCheck'] = async ({
    endpointId,
    probe,
  }) => {
    const rows = await drizzleDb
      .select()
      .from(statusChecks)
      .where(
        and(
          eq(statusChecks.endpointId, endpointId),
          eq(statusChecks.probe, probe),
        ),
      )
      .orderBy(desc(statusChecks.checkedAt))
      .limit(1)

    return rows[0] ? toCheckRow(rows[0]) : null
  }

  const listChecksSince: Db['listChecksSince'] = async ({
    endpointId,
    probe,
    sinceMs,
  }) => {
    const rows = await drizzleDb
      .select()
      .from(statusChecks)
      .where(
        and(
          eq(statusChecks.endpointId, endpointId),
          eq(statusChecks.probe, probe),
          gte(statusChecks.checkedAt, msToDate(sinceMs)),
        ),
      )
      .orderBy(asc(statusChecks.checkedAt))

    return rows.map(toCheckRow)
  }

  const deleteChecksBefore: Db['deleteChecksBefore'] = async ({ beforeMs }) => {
    const before = msToDate(beforeMs)

    await drizzleDb
      .delete(statusChecks)
      .where(lt(statusChecks.checkedAt, before))

    await drizzleDb
      .delete(statusInternetChecks)
      .where(lt(statusInternetChecks.checkedAt, before))
  }

  const upsertDailyRollup: Db['upsertDailyRollup'] = async ({ rollup }) => {
    await drizzleDb
      .insert(statusRollupsDaily)
      .values({
        avgLatencyMs: rollup.avgLatencyMs,
        dayStart: msToDate(rollup.dayStartMs),
        degraded: rollup.degraded,
        down: rollup.down,
        endpointId: rollup.endpointId,
        p95LatencyMs: rollup.p95LatencyMs,
        probe: rollup.probe,
        total: rollup.total,
        up: rollup.up,
      })
      .onConflictDoUpdate({
        set: {
          avgLatencyMs: rollup.avgLatencyMs,
          degraded: rollup.degraded,
          down: rollup.down,
          p95LatencyMs: rollup.p95LatencyMs,
          total: rollup.total,
          up: rollup.up,
        },
        target: [
          statusRollupsDaily.endpointId,
          statusRollupsDaily.probe,
          statusRollupsDaily.dayStart,
        ],
      })
  }

  const getDailyRollups: Db['getDailyRollups'] = async ({
    endpointId,
    probe,
    sinceMs,
  }) => {
    const rows = await drizzleDb
      .select()
      .from(statusRollupsDaily)
      .where(
        and(
          eq(statusRollupsDaily.endpointId, endpointId),
          eq(statusRollupsDaily.probe, probe),
          gte(statusRollupsDaily.dayStart, msToDate(sinceMs)),
        ),
      )
      .orderBy(asc(statusRollupsDaily.dayStart))

    return rows.map(toDailyRollupRow)
  }

  const getServiceDokploy: Db['getServiceDokploy'] = async ({ serviceId }) => {
    const rows = await drizzleDb
      .select()
      .from(statusServiceDokploy)
      .where(eq(statusServiceDokploy.serviceId, serviceId))
      .limit(1)

    const row = rows[0]
    if (!row) return null

    return {
      lastDeployedAtMs: dateMaybeToMs(row.lastDeployedAt),
      lastSyncAtMs: dateToMs(row.lastSyncAt),
      refId: row.refId,
      serviceId: row.serviceId,
      type: row.type as DokployRefType,
    }
  }

  const upsertServiceDokploy: Db['upsertServiceDokploy'] = async ({
    refId,
    serviceId,
    type,
  }) => {
    await drizzleDb
      .insert(statusServiceDokploy)
      .values({
        lastDeployedAt: null,
        lastSyncAt: new Date(0),
        refId,
        serviceId,
        type,
      })
      .onConflictDoUpdate({
        set: {
          refId,
          type,
        },
        target: statusServiceDokploy.serviceId,
      })
  }

  const updateServiceDokploySync: Db['updateServiceDokploySync'] = async ({
    lastDeployedAtMs,
    lastSyncAtMs,
    serviceId,
  }) => {
    await drizzleDb
      .update(statusServiceDokploy)
      .set({
        lastDeployedAt:
          lastDeployedAtMs !== null ? msToDate(lastDeployedAtMs) : null,
        lastSyncAt: msToDate(lastSyncAtMs),
      })
      .where(eq(statusServiceDokploy.serviceId, serviceId))
  }

  return {
    deleteChecksBefore,
    getDailyRollups,
    getLatestCheck,
    getLatestInternetCheck,
    getServiceById,
    getServiceByPublicHost,
    getServiceDokploy,
    insertCheck,
    insertInternetCheck,
    listActiveEndpoints,
    listChecksSince,
    listEndpointsByServiceId,
    listServices,
    updateEndpoint,
    updateService,
    updateServiceDokploySync,
    upsertDailyRollup,
    upsertEndpoint,
    upsertService,
    upsertServiceDokploy,
  }
}
