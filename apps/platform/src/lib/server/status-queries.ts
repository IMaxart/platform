import { db } from '@platform/db'
import {
  services,
  statusChecks,
  statusEndpoints,
  statusServiceDokploy,
} from '@platform/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

type EndpointStatus = 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'UP'

const getEndpointStatus = (
  check: null | { degraded: boolean; latencyMs: null | number; ok: boolean },
): EndpointStatus => {
  if (!check) return 'UNKNOWN'
  if (!check.ok) return 'DOWN'
  if (check.degraded) return 'DEGRADED'
  return 'UP'
}

export const getStatusServices = createServerFn({ method: 'GET' }).handler(
  async () => {
    const allServices = await db
      .select()
      .from(services)
      .orderBy(asc(services.name))

    const serviceIds = allServices.map((s) => s.id)
    if (serviceIds.length === 0) return []

    const [endpoints, dokployRows] = await Promise.all([
      db
        .select()
        .from(statusEndpoints)
        .where(inArray(statusEndpoints.serviceId, serviceIds)),
      db
        .select()
        .from(statusServiceDokploy)
        .where(inArray(statusServiceDokploy.serviceId, serviceIds)),
    ])

    const endpointIds = endpoints.map((e) => e.id)
    const checksRows =
      endpointIds.length === 0
        ? []
        : await db
            .select()
            .from(statusChecks)
            .where(
              and(
                inArray(statusChecks.endpointId, endpointIds),
                eq(statusChecks.probe, 'internal'),
              ),
            )
            .orderBy(desc(statusChecks.checkedAt))
    const latestCheckByEndpoint = new Map<
      string,
      { degraded: boolean; latencyMs: null | number; ok: boolean }
    >()
    for (const row of checksRows) {
      if (!latestCheckByEndpoint.has(row.endpointId)) {
        latestCheckByEndpoint.set(row.endpointId, {
          degraded: row.degraded,
          latencyMs: row.latencyMs,
          ok: row.ok,
        })
      }
    }

    const dokployByService = new Map(dokployRows.map((d) => [d.serviceId, d]))

    return allServices.map((service) => {
      const serviceEndpoints = endpoints.filter(
        (e) => e.serviceId === service.id,
      )
      const dokploy = dokployByService.get(service.id) ?? null

      return {
        ...service,
        dokploy,
        endpoints: serviceEndpoints.map((ep) => {
          const latestCheck = latestCheckByEndpoint.get(ep.id) ?? null
          return {
            ...ep,
            latestCheck,
            status: getEndpointStatus(latestCheck),
          }
        }),
      }
    })
  },
)

export const getServiceStatusDetail = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    const service = await db.query.services.findFirst({
      where: eq(services.id, serviceId),
    })
    if (!service) return null

    const endpointRows = await db
      .select()
      .from(statusEndpoints)
      .where(eq(statusEndpoints.serviceId, serviceId))

    const endpointIds = endpointRows.map((e) => e.id)
    const checksRows =
      endpointIds.length === 0
        ? []
        : await db
            .select()
            .from(statusChecks)
            .where(
              and(
                inArray(statusChecks.endpointId, endpointIds),
                eq(statusChecks.probe, 'internal'),
              ),
            )
            .orderBy(desc(statusChecks.checkedAt))

    const latestCheckByEndpoint = new Map<
      string,
      { degraded: boolean; latencyMs: null | number; ok: boolean }
    >()
    for (const row of checksRows) {
      if (!latestCheckByEndpoint.has(row.endpointId)) {
        latestCheckByEndpoint.set(row.endpointId, {
          degraded: row.degraded,
          latencyMs: row.latencyMs,
          ok: row.ok,
        })
      }
    }

    const dokployRows = await db
      .select()
      .from(statusServiceDokploy)
      .where(eq(statusServiceDokploy.serviceId, serviceId))
      .limit(1)

    return {
      ...service,
      dokploy: dokployRows[0] ?? null,
      endpoints: endpointRows.map((ep) => {
        const latestCheck = latestCheckByEndpoint.get(ep.id) ?? null
        return {
          ...ep,
          latestCheck,
          status: getEndpointStatus(latestCheck),
        }
      }),
    }
  })

const createStatusServiceSchema = z.object({
  name: z.string(),
  primaryDomain: z.string().nullable().optional(),
  publicStatusHost: z.string(),
  slug: z.string(),
})

export const createStatusService = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => createStatusServiceSchema.parse(data))
  .handler(async ({ data }) => {
    const id = crypto.randomUUID()
    const createdAt = new Date()
    const created = await db
      .insert(services)
      .values({
        createdAt,
        enabled: true,
        id,
        name: data.name,
        primaryDomain: data.primaryDomain ?? null,
        projectId: '00000000-0000-0000-0000-000000000000',
        publicStatusHost: data.publicStatusHost,
        slug: data.slug,
        statusEnabled: true,
      })
      .returning()
    const first = created.at(0)
    if (!first) throw new Error('Failed to create service')
    return first
  })

const updateStatusServiceSchema = z.object({
  id: z.uuid(),
  patch: z.object({
    enabled: z.boolean().optional(),
    name: z.string().optional(),
    primaryDomain: z.string().nullable().optional(),
    publicStatusHost: z.string().optional(),
    slug: z.string().optional(),
  }),
})

export const updateStatusService = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => updateStatusServiceSchema.parse(data))
  .handler(async ({ data: { id, patch } }) => {
    const set: Record<string, unknown> = {}
    if (patch.slug !== undefined) set['slug'] = patch.slug
    if (patch.name !== undefined) set['name'] = patch.name
    if (patch.primaryDomain !== undefined)
      set['primaryDomain'] = patch.primaryDomain
    if (patch.publicStatusHost !== undefined)
      set['publicStatusHost'] = patch.publicStatusHost
    if (patch.enabled !== undefined) set['enabled'] = patch.enabled
    if (Object.keys(set).length === 0) return
    await db.update(services).set(set).where(eq(services.id, id))
  })

const createStatusEndpointSchema = z.object({
  degradedMs: z.number().optional(),
  displayName: z.string(),
  expectedStatusMax: z.number().optional(),
  expectedStatusMin: z.number().optional(),
  internalHost: z.string().nullable().optional(),
  internalMode: z.enum(['directUrl', 'traefikHost']),
  internalPath: z.string(),
  internalUrl: z.string().nullable().optional(),
  intervalSec: z.number().optional(),
  key: z.string(),
  method: z.enum(['GET', 'HEAD']).optional(),
  publicUrl: z.string().nullable().optional(),
  serviceId: z.uuid(),
  timeoutMs: z.number().optional(),
  warnMs: z.number().optional(),
})

export const createStatusEndpoint = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => createStatusEndpointSchema.parse(data))
  .handler(async ({ data }) => {
    const defaults = {
      degradedMs: 5000,
      expectedStatusMax: 299,
      expectedStatusMin: 200,
      intervalSec: 60,
      method: 'GET' as const,
      timeoutMs: 10000,
      warnMs: 2000,
    }
    const inserted = await db
      .insert(statusEndpoints)
      .values({
        degradedMs: data.degradedMs ?? defaults.degradedMs,
        displayName: data.displayName,
        expectedStatusMax: data.expectedStatusMax ?? defaults.expectedStatusMax,
        expectedStatusMin: data.expectedStatusMin ?? defaults.expectedStatusMin,
        internalHost: data.internalHost ?? null,
        internalMode: data.internalMode,
        internalPath: data.internalPath,
        internalUrl: data.internalUrl ?? null,
        intervalSec: data.intervalSec ?? defaults.intervalSec,
        key: data.key,
        method: data.method ?? defaults.method,
        publicUrl: data.publicUrl ?? null,
        serviceId: data.serviceId,
        timeoutMs: data.timeoutMs ?? defaults.timeoutMs,
        warnMs: data.warnMs ?? defaults.warnMs,
      })
      .returning()
    const first = inserted[0]
    if (!first) throw new Error('Failed to create endpoint')
    return first
  })

const updateStatusEndpointSchema = z.object({
  id: z.uuid(),
  patch: z.object({
    degradedMs: z.number().optional(),
    displayName: z.string().optional(),
    enabled: z.boolean().optional(),
    expectedStatusMax: z.number().optional(),
    expectedStatusMin: z.number().optional(),
    internalHost: z.string().nullable().optional(),
    internalMode: z.string().optional(),
    internalPath: z.string().optional(),
    internalUrl: z.string().nullable().optional(),
    intervalSec: z.number().optional(),
    key: z.string().optional(),
    method: z.string().optional(),
    publicUrl: z.string().nullable().optional(),
    serviceId: z.uuid().optional(),
    timeoutMs: z.number().optional(),
    warnMs: z.number().optional(),
  }),
})

export const updateStatusEndpoint = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => updateStatusEndpointSchema.parse(data))
  .handler(async ({ data: { id, patch } }) => {
    const set: Record<string, unknown> = {}
    if (patch.serviceId !== undefined) set['serviceId'] = patch.serviceId
    if (patch.key !== undefined) set['key'] = patch.key
    if (patch.displayName !== undefined) set['displayName'] = patch.displayName
    if (patch.internalMode !== undefined)
      set['internalMode'] = patch.internalMode
    if (patch.internalPath !== undefined)
      set['internalPath'] = patch.internalPath
    if (patch.internalHost !== undefined)
      set['internalHost'] = patch.internalHost
    if (patch.internalUrl !== undefined) set['internalUrl'] = patch.internalUrl
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
    if (patch.enabled !== undefined) set['enabled'] = patch.enabled
    if (Object.keys(set).length === 0) return
    await db.update(statusEndpoints).set(set).where(eq(statusEndpoints.id, id))
  })

const upsertStatusDokploySchema = z.object({
  refId: z.string(),
  serviceId: z.uuid(),
  type: z.enum(['application', 'compose']),
})

export const upsertStatusDokploy = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => upsertStatusDokploySchema.parse(data))
  .handler(async ({ data: { refId, serviceId, type } }) => {
    await db
      .insert(statusServiceDokploy)
      .values({
        lastSyncAt: new Date(),
        refId,
        serviceId,
        type,
      })
      .onConflictDoUpdate({
        set: { refId, type },
        target: statusServiceDokploy.serviceId,
      })
  })
