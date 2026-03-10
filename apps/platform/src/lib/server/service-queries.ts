import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  excludedDevices,
  featureFlags,
  pageViews,
  serviceInvitations,
  serviceMembers,
  services,
  statusChecks,
  statusEndpoints,
  statusRollupsDaily,
  users,
  visitorSessions,
} from '@platform/db/schema'
import { sendMail } from '@platform/email'
import { ServiceInvite } from '@platform/email/templates'
import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { INVITATION_EXPIRY_DAYS } from './constants'

// ── Services CRUD ──

export const getProjectServices = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db.query.services.findMany({
      orderBy: [desc(services.createdAt)],
      where: eq(services.projectId, projectId),
      with: {
        endpoints: true,
      },
    })
  })

type CreateServiceParams = {
  allowedOrigins?: string[]
  analyticsEnabled?: boolean
  dataRetentionDays?: number
  domain?: string
  enabled?: boolean
  environments?: string[]
  name: string
  primaryDomain?: string
  projectId: string
  publicStatusHost?: string
  salt?: string
  slug: string
  statusEnabled?: boolean
  trackErrors?: boolean
  trackEvents?: boolean
  trackFeatureFlags?: boolean
}

export const createService = createServerFn({ method: 'POST' })
  .inputValidator((d: CreateServiceParams) => d)
  .handler(async ({ data }) => {
    const [service] = await db
      .insert(services)
      .values({
        allowedOrigins: data.allowedOrigins ?? [],
        analyticsEnabled: data.analyticsEnabled ?? false,
        dataRetentionDays: data.dataRetentionDays ?? 365,
        domain: data.domain ?? null,
        enabled: data.enabled ?? true,
        environments: data.environments ?? ['production'],
        name: data.name,
        primaryDomain: data.primaryDomain ?? null,
        projectId: data.projectId,
        publicStatusHost: data.publicStatusHost ?? null,
        salt: data.salt ?? null,
        slug: data.slug,
        statusEnabled: data.statusEnabled ?? false,
        trackErrors: data.trackErrors ?? true,
        trackEvents: data.trackEvents ?? true,
        trackFeatureFlags: data.trackFeatureFlags ?? false,
      })
      .returning()

    return service
  })

type UpdateServiceParams = {
  analyticsEnabled?: boolean
  domain?: null | string
  enabled?: boolean
  name?: string
  primaryDomain?: null | string
  publicStatusHost?: null | string
  slug?: string
  statusEnabled?: boolean
}

export const updateService = createServerFn({ method: 'POST' })
  .inputValidator((d: { patch: UpdateServiceParams; serviceId: string }) => d)
  .handler(async ({ data: { patch, serviceId } }) => {
    const set: Record<string, unknown> = {}

    if (patch.name !== undefined) set['name'] = patch.name
    if (patch.slug !== undefined) set['slug'] = patch.slug
    if (patch.domain !== undefined) set['domain'] = patch.domain
    if (patch.analyticsEnabled !== undefined)
      set['analyticsEnabled'] = patch.analyticsEnabled
    if (patch.statusEnabled !== undefined)
      set['statusEnabled'] = patch.statusEnabled
    if (patch.publicStatusHost !== undefined)
      set['publicStatusHost'] = patch.publicStatusHost
    if (patch.primaryDomain !== undefined)
      set['primaryDomain'] = patch.primaryDomain
    if (patch.enabled !== undefined) set['enabled'] = patch.enabled

    if (Object.keys(set).length === 0) return { ok: true }

    await db.update(services).set(set).where(eq(services.id, serviceId))

    return { ok: true }
  })

export const deleteService = createServerFn({ method: 'POST' })
  .inputValidator((d: { serviceId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(services).where(eq(services.id, data.serviceId))

    return { ok: true }
  })

// ── Endpoints ──

export const createEndpoint = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      degradedMs: number
      displayName: string
      expectedStatusMax: number
      expectedStatusMin: number
      internalMode: string
      internalPath: string
      internalUrl?: string
      intervalSec: number
      key: string
      method: string
      publicUrl?: string
      serviceId: string
      timeoutMs: number
      warnMs: number
    }) => d,
  )
  .handler(async ({ data }) => {
    const [endpoint] = await db
      .insert(statusEndpoints)
      .values({
        degradedMs: data.degradedMs,
        displayName: data.displayName,
        expectedStatusMax: data.expectedStatusMax,
        expectedStatusMin: data.expectedStatusMin,
        internalMode: data.internalMode,
        internalPath: data.internalPath,
        internalUrl: data.internalUrl ?? null,
        intervalSec: data.intervalSec,
        key: data.key,
        method: data.method,
        publicUrl: data.publicUrl ?? null,
        serviceId: data.serviceId,
        timeoutMs: data.timeoutMs,
        warnMs: data.warnMs,
      })
      .returning()

    return endpoint
  })

export const deleteEndpoint = createServerFn({ method: 'POST' })
  .inputValidator((d: { endpointId: string }) => d)
  .handler(async ({ data }) => {
    await db
      .delete(statusEndpoints)
      .where(eq(statusEndpoints.id, data.endpointId))

    return { ok: true }
  })

// ── Service Config ──

export const updateServiceConfig = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      serviceId: string
      trackErrors: boolean
      trackEvents: boolean
      trackFeatureFlags: boolean
    }) => d,
  )
  .handler(
    async ({
      data: { serviceId, trackErrors, trackEvents, trackFeatureFlags },
    }) => {
      await db
        .update(services)
        .set({ trackErrors, trackEvents, trackFeatureFlags })
        .where(eq(services.id, serviceId))

      return { ok: true }
    },
  )

// ── Feature Flags ──

export const getFeatureFlags = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    return db.query.featureFlags.findMany({
      orderBy: [desc(featureFlags.createdAt)],
      where: eq(featureFlags.serviceId, serviceId),
    })
  })

// ── Excluded Devices ──

export const getExcludedDevicesList = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    return db.query.excludedDevices.findMany({
      orderBy: [desc(excludedDevices.createdAt)],
      where: eq(excludedDevices.serviceId, serviceId),
    })
  })

type AddExcludedDeviceParams = {
  name: string
  reason?: string
  serviceId: string
  visitorHash: string
}

export const addExcludedDevice = createServerFn({ method: 'POST' })
  .inputValidator((d: AddExcludedDeviceParams) => d)
  .handler(async ({ data }) => {
    await db.insert(excludedDevices).values({
      name: data.name,
      reason: data.reason,
      serviceId: data.serviceId,
      visitorHash: data.visitorHash,
    })
    return { ok: true }
  })

export const deleteExcludedDevice = createServerFn({ method: 'POST' })
  .inputValidator((d: { deviceId: string }) => d)
  .handler(async ({ data: { deviceId } }) => {
    await db.delete(excludedDevices).where(eq(excludedDevices.id, deviceId))
    return { ok: true }
  })

// ── Data Purge ──

export const purgeAnalyticsData = createServerFn({ method: 'POST' })
  .inputValidator((d: { serviceId: string }) => d)
  .handler(async ({ data: { serviceId } }) => {
    await db.transaction(async (tx) => {
      await tx.delete(pageViews).where(eq(pageViews.serviceId, serviceId))
      await tx.delete(events).where(eq(events.serviceId, serviceId))
      await tx
        .delete(consoleErrors)
        .where(eq(consoleErrors.serviceId, serviceId))
      await tx
        .delete(visitorSessions)
        .where(eq(visitorSessions.serviceId, serviceId))
      await tx
        .delete(excludedDevices)
        .where(eq(excludedDevices.serviceId, serviceId))
    })

    return { ok: true }
  })

export const purgeErrorData = createServerFn({ method: 'POST' })
  .inputValidator((d: { serviceId: string }) => d)
  .handler(async ({ data: { serviceId } }) => {
    await db.delete(consoleErrors).where(eq(consoleErrors.serviceId, serviceId))

    return { ok: true }
  })

export const purgeStatusData = createServerFn({ method: 'POST' })
  .inputValidator((d: { serviceId: string }) => d)
  .handler(async ({ data: { serviceId } }) => {
    const endpointIds = await db
      .select({ id: statusEndpoints.id })
      .from(statusEndpoints)
      .where(eq(statusEndpoints.serviceId, serviceId))

    const ids = endpointIds.map((e) => e.id)

    if (ids.length > 0) {
      await db.transaction(async (tx) => {
        await tx
          .delete(statusRollupsDaily)
          .where(inArray(statusRollupsDaily.endpointId, ids))
        await tx
          .delete(statusChecks)
          .where(inArray(statusChecks.endpointId, ids))
      })
    }

    return { ok: true }
  })

// ── Service Members ──

export const getServiceMembers = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    return db
      .select({
        createdAt: serviceMembers.createdAt,
        email: users.email,
        id: serviceMembers.id,
        name: users.name,
        role: serviceMembers.role,
        userId: serviceMembers.userId,
      })
      .from(serviceMembers)
      .innerJoin(users, eq(serviceMembers.userId, users.id))
      .where(eq(serviceMembers.serviceId, serviceId))
      .orderBy(desc(serviceMembers.createdAt))
  })

export const addServiceMember = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { role?: string; serviceId: string; userId: string }) => d,
  )
  .handler(async ({ data }) => {
    const [member] = await db
      .insert(serviceMembers)
      .values({
        role: data.role ?? 'viewer',
        serviceId: data.serviceId,
        userId: data.userId,
      })
      .onConflictDoNothing()
      .returning()

    return member ?? null
  })

export const removeServiceMember = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(serviceMembers).where(eq(serviceMembers.id, data.memberId))

    return { ok: true }
  })

export const updateServiceMemberRole = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string; role: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(serviceMembers)
      .set({ role: data.role })
      .where(eq(serviceMembers.id, data.memberId))

    return { ok: true }
  })

// ── Service Invitations ──

export const createServiceInvitation = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      email: string
      inviterId: string
      role?: string
      serviceId: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const [invitation] = await db
      .insert(serviceInvitations)
      .values({
        email: data.email,
        expiresAt,
        inviterId: data.inviterId,
        role: data.role ?? 'viewer',
        serviceId: data.serviceId,
      })
      .returning()

    const service = await db.query.services.findFirst({
      where: eq(services.id, data.serviceId),
    })

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, data.inviterId),
    })

    if (invitation) {
      const baseUrl = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'

      await sendMail({
        subject: `You've been invited to service ${service?.name ?? data.serviceId}`,
        template: ServiceInvite({
          inviterName: inviter?.name,
          role: invitation.role,
          serviceName: service?.name ?? data.serviceId,
          url: `${baseUrl}/invite/service/${invitation.id}`,
        }),
        to: data.email,
      })
    }

    return invitation
  })

export const getServiceInvitations = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    return db
      .select({
        createdAt: serviceInvitations.createdAt,
        email: serviceInvitations.email,
        expiresAt: serviceInvitations.expiresAt,
        id: serviceInvitations.id,
        role: serviceInvitations.role,
        status: serviceInvitations.status,
      })
      .from(serviceInvitations)
      .where(
        and(
          eq(serviceInvitations.serviceId, serviceId),
          eq(serviceInvitations.status, 'pending'),
        ),
      )
      .orderBy(desc(serviceInvitations.createdAt))
  })

export const cancelServiceInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(serviceInvitations)
      .set({ status: 'cancelled' })
      .where(eq(serviceInvitations.id, data.invitationId))

    return { ok: true }
  })

export const acceptServiceInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const invitation = await db.query.serviceInvitations.findFirst({
      where: eq(serviceInvitations.id, data.invitationId),
    })

    if (!invitation) return { error: 'Invitation not found' }
    if (invitation.status !== 'pending') return { error: 'Invitation expired' }
    if (new Date() > invitation.expiresAt)
      return { error: 'Invitation expired' }

    await db
      .insert(serviceMembers)
      .values({
        role: invitation.role,
        serviceId: invitation.serviceId,
        userId: data.userId,
      })
      .onConflictDoNothing()

    await db
      .update(serviceInvitations)
      .set({ status: 'accepted' })
      .where(eq(serviceInvitations.id, data.invitationId))

    return { ok: true, serviceId: invitation.serviceId }
  })

export const getServiceInvitationById = createServerFn({ method: 'GET' })
  .inputValidator((invitationId: string) => invitationId)
  .handler(async ({ data: invitationId }) => {
    const invitation = await db.query.serviceInvitations.findFirst({
      where: eq(serviceInvitations.id, invitationId),
      with: { service: true },
    })

    return invitation ?? null
  })
