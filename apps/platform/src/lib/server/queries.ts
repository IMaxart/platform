import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  excludedDevices,
  featureFlags,
  pageViews,
  projectInvitations,
  projectMembers,
  projects,
  serviceInvitations,
  serviceMembers,
  services,
  statusEndpoints,
  users,
  visitorSessions,
} from '@platform/db/schema'
import { sendMail } from '@platform/email'
import { ProjectInvite, ServiceInvite } from '@platform/email/templates'
import { createServerFn } from '@tanstack/react-start'
import {
  and,
  avg,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  inArray,
  lte,
  ne,
  not,
  sql,
} from 'drizzle-orm'

const getExcludedHashes = async (serviceId: string): Promise<string[]> => {
  const excluded = await db
    .select({ visitorHash: excludedDevices.visitorHash })
    .from(excludedDevices)
    .where(eq(excludedDevices.serviceId, serviceId))

  return excluded.map((e) => e.visitorHash)
}

const excludeCondition = (excludedHashes: string[], showExcluded: boolean) => {
  if (showExcluded || excludedHashes.length === 0) return undefined
  return not(inArray(visitorSessions.visitorHash, excludedHashes))
}

// --- Projects ---

/** Fetch projects scoped to a team, or all if no teamId given. */
export const getProjects = createServerFn({ method: 'GET' })
  .inputValidator((d: undefined | { teamId?: string }) => d)
  .handler(async ({ data }) => {
    const teamId = data?.teamId
    const conditions = teamId !== undefined ? [eq(projects.teamId, teamId)] : []

    return db.query.projects.findMany({
      orderBy: [desc(projects.createdAt)],
      where: conditions.length > 0 ? and(...conditions) : undefined,
    })
  })

/** Fetch a single project by ID. */
export const getProject = createServerFn({ method: 'GET' })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    return db.query.projects.findFirst({
      where: eq(projects.id, id),
    })
  })

// --- Overview Stats ---

type OverviewParams = {
  serviceId: string
  showExcluded?: boolean
}

/** Fetch visitor stats: today, yesterday, last 7/30/365 days, page views, avg duration. */
export const getVisitorStats = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams) => d)
  .handler(async ({ data: { serviceId, showExcluded = false } }) => {
    const excludedHashes = await getExcludedHashes(serviceId)
    const now = new Date()
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    )
    const yesterdayStart = new Date(todayStart.getTime() - 86400000)
    const day7Start = new Date(todayStart.getTime() - 7 * 86400000)
    const day30Start = new Date(todayStart.getTime() - 30 * 86400000)
    const yearStart = new Date(todayStart.getTime() - 365 * 86400000)

    const baseConditions = [
      eq(visitorSessions.serviceId, serviceId),
      eq(visitorSessions.isBot, false),
      excludeCondition(excludedHashes, showExcluded),
    ].filter(Boolean)

    const [
      today,
      yesterday,
      last7,
      last30,
      lastYear,
      totalPageViews,
      avgDuration,
    ] = await Promise.all([
      db
        .select({ count: countDistinct(visitorSessions.visitorHash) })
        .from(visitorSessions)
        .where(
          and(...baseConditions, gte(visitorSessions.startedAt, todayStart)),
        ),
      db
        .select({ count: countDistinct(visitorSessions.visitorHash) })
        .from(visitorSessions)
        .where(
          and(
            ...baseConditions,
            gte(visitorSessions.startedAt, yesterdayStart),
            lte(visitorSessions.startedAt, todayStart),
          ),
        ),
      db
        .select({ count: countDistinct(visitorSessions.visitorHash) })
        .from(visitorSessions)
        .where(
          and(...baseConditions, gte(visitorSessions.startedAt, day7Start)),
        ),
      db
        .select({ count: countDistinct(visitorSessions.visitorHash) })
        .from(visitorSessions)
        .where(
          and(...baseConditions, gte(visitorSessions.startedAt, day30Start)),
        ),
      db
        .select({ count: countDistinct(visitorSessions.visitorHash) })
        .from(visitorSessions)
        .where(
          and(...baseConditions, gte(visitorSessions.startedAt, yearStart)),
        ),
      db
        .select({ count: count() })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.serviceId, serviceId),
            gte(pageViews.enteredAt, day30Start),
          ),
        ),
      db
        .select({ avg: avg(pageViews.durationMs) })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.serviceId, serviceId),
            gte(pageViews.enteredAt, day30Start),
          ),
        ),
    ])

    return {
      avgDurationMs: Math.round(Number(avgDuration[0]?.avg ?? 0)),
      last7: last7[0]?.count ?? 0,
      last30: last30[0]?.count ?? 0,
      lastYear: lastYear[0]?.count ?? 0,
      today: today[0]?.count ?? 0,
      totalPageViews: totalPageViews[0]?.count ?? 0,
      yesterday: yesterday[0]?.count ?? 0,
    }
  })

/** Fetch daily visitor counts for chart over the given number of days. */
export const getVisitorChart = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number }) => d)
  .handler(async ({ data: { days, serviceId, showExcluded = false } }) => {
    const excludedHashes = await getExcludedHashes(serviceId)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const excludeFilter = excludeCondition(excludedHashes, showExcluded)
    const conditions = [
      eq(visitorSessions.serviceId, serviceId),
      eq(visitorSessions.isBot, false),
      gte(visitorSessions.startedAt, startDate),
      excludeFilter,
    ].filter(Boolean)

    const results = await db
      .select({
        date: sql<string>`DATE(${visitorSessions.startedAt})`.as('date'),
        sessionCount: count(),
        visitors: countDistinct(visitorSessions.visitorHash),
      })
      .from(visitorSessions)
      .where(and(...conditions))
      .groupBy(sql`DATE(${visitorSessions.startedAt})`)
      .orderBy(sql`DATE(${visitorSessions.startedAt})`)

    return results
  })

/** Fetch top pages by views and unique visitors over the given days. */
export const getTopPages = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        avgDurationMs: avg(pageViews.durationMs),
        path: pageViews.path,
        uniqueVisitors: countDistinct(visitorSessions.visitorHash),
        views: count(),
      })
      .from(pageViews)
      .innerJoin(visitorSessions, eq(pageViews.sessionId, visitorSessions.id))
      .where(
        and(
          eq(pageViews.serviceId, serviceId),
          gte(pageViews.enteredAt, startDate),
          eq(visitorSessions.isBot, false),
        ),
      )
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(limit)
  })

/** Fetch top referrers by unique visitor count over the given days. */
export const getTopReferrers = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: countDistinct(visitorSessions.visitorHash),
        referrer: visitorSessions.referrer,
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.serviceId, serviceId),
          gte(visitorSessions.startedAt, startDate),
          eq(visitorSessions.isBot, false),
          ne(sql`${visitorSessions.referrer}`, ''),
        ),
      )
      .groupBy(visitorSessions.referrer)
      .orderBy(desc(countDistinct(visitorSessions.visitorHash)))
      .limit(limit)
  })

/** Fetch top countries by unique visitor count over the given days. */
export const getTopCountries = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: countDistinct(visitorSessions.visitorHash),
        countryCode: visitorSessions.countryCode,
      })
      .from(visitorSessions)
      .where(
        and(
          eq(visitorSessions.serviceId, serviceId),
          gte(visitorSessions.startedAt, startDate),
          eq(visitorSessions.isBot, false),
        ),
      )
      .groupBy(visitorSessions.countryCode)
      .orderBy(desc(countDistinct(visitorSessions.visitorHash)))
      .limit(limit)
  })

/** Fetch human vs bot session counts over the given days. */
export const getBotStats = createServerFn({ method: 'GET' })
  .inputValidator((d: { days: number; serviceId: string }) => d)
  .handler(async ({ data: { days, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [humans, bots] = await Promise.all([
      db
        .select({ count: count() })
        .from(visitorSessions)
        .where(
          and(
            eq(visitorSessions.serviceId, serviceId),
            gte(visitorSessions.startedAt, startDate),
            eq(visitorSessions.isBot, false),
          ),
        ),
      db
        .select({ count: count() })
        .from(visitorSessions)
        .where(
          and(
            eq(visitorSessions.serviceId, serviceId),
            gte(visitorSessions.startedAt, startDate),
            eq(visitorSessions.isBot, true),
          ),
        ),
    ])

    return {
      bots: bots[0]?.count ?? 0,
      humans: humans[0]?.count ?? 0,
    }
  })

// --- Events ---

/** Fetch custom events aggregated by name over the given days. */
export const getEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: { days: number; limit?: number; offset?: number; serviceId: string }) =>
      d,
  )
  .handler(async ({ data: { days, limit = 50, offset = 0, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: count(),
        lastSeen: sql<string>`MAX(${events.createdAt})`.as('last_seen'),
        name: events.name,
      })
      .from(events)
      .where(
        and(eq(events.serviceId, serviceId), gte(events.createdAt, startDate)),
      )
      .groupBy(events.name)
      .orderBy(desc(count()))
      .limit(limit)
      .offset(offset)
  })

// --- Sessions ---

/** Fetch sessions with page views, events, and console errors for the given service and date range. */
export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      days: number
      limit?: number
      offset?: number
      serviceId: string
      showBots?: boolean
      showExcluded?: boolean
    }) => d,
  )
  .handler(
    async ({
      data: {
        days,
        limit = 50,
        offset = 0,
        serviceId,
        showBots = false,
        showExcluded = false,
      },
    }) => {
      const excludedHashes = await getExcludedHashes(serviceId)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conditions = [
        eq(visitorSessions.serviceId, serviceId),
        gte(visitorSessions.startedAt, startDate),
        showBots ? undefined : eq(visitorSessions.isBot, false),
        excludeCondition(excludedHashes, showExcluded),
      ].filter(Boolean)

      return db.query.visitorSessions.findMany({
        limit,
        offset,
        orderBy: [desc(visitorSessions.startedAt)],
        where: and(...conditions),
        with: {
          consoleErrors: {
            orderBy: [desc(consoleErrors.createdAt)],
          },
          events: {
            orderBy: [desc(events.createdAt)],
          },
          pageViews: {
            orderBy: [desc(pageViews.enteredAt)],
          },
        },
      })
    },
  )

// --- Console Errors ---

/** Fetch console errors aggregated by message and level over the given days. */
export const getConsoleErrors = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      days: number
      level?: string
      limit?: number
      offset?: number
      serviceId: string
    }) => d,
  )
  .handler(
    async ({ data: { days, level, limit = 50, offset = 0, serviceId } }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conditions = [
        eq(consoleErrors.serviceId, serviceId),
        gte(consoleErrors.createdAt, startDate),
        level !== undefined ? eq(consoleErrors.level, level) : undefined,
      ].filter(Boolean)

      return db
        .select({
          count: count(),
          lastSeen: sql<string>`MAX(${consoleErrors.createdAt})`.as(
            'last_seen',
          ),
          latestPath:
            sql<string>`(ARRAY_AGG(${consoleErrors.path} ORDER BY ${consoleErrors.createdAt} DESC))[1]`.as(
              'latest_path',
            ),
          latestStack:
            sql<string>`(ARRAY_AGG(${consoleErrors.stack} ORDER BY ${consoleErrors.createdAt} DESC))[1]`.as(
              'latest_stack',
            ),
          level: consoleErrors.level,
          message: consoleErrors.message,
        })
        .from(consoleErrors)
        .where(and(...conditions))
        .groupBy(consoleErrors.message, consoleErrors.level)
        .orderBy(desc(count()))
        .limit(limit)
        .offset(offset)
    },
  )

/** Create a new project optionally scoped to a team. */
export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string; teamId?: string }) => d)
  .handler(async ({ data }) => {
    const [project] = await db
      .insert(projects)
      .values({
        name: data.name,
        teamId: data.teamId ?? null,
      })
      .returning()

    return project
  })

// --- Project Members ---

export const getProjectMembers = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db
      .select({
        createdAt: projectMembers.createdAt,
        email: users.email,
        id: projectMembers.id,
        name: users.name,
        role: projectMembers.role,
        userId: projectMembers.userId,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(desc(projectMembers.createdAt))
  })

export const addProjectMember = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { projectId: string; role?: string; userId: string }) => d,
  )
  .handler(async ({ data }) => {
    const [member] = await db
      .insert(projectMembers)
      .values({
        projectId: data.projectId,
        role: data.role ?? 'viewer',
        userId: data.userId,
      })
      .onConflictDoNothing()
      .returning()

    return member ?? null
  })

export const removeProjectMember = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(projectMembers).where(eq(projectMembers.id, data.memberId))

    return { ok: true }
  })

export const updateProjectMemberRole = createServerFn({ method: 'POST' })
  .inputValidator((d: { memberId: string; role: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(projectMembers)
      .set({ role: data.role })
      .where(eq(projectMembers.id, data.memberId))

    return { ok: true }
  })

// --- Project Invitations ---

const INVITATION_EXPIRY_DAYS = 7

export const createProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      email: string
      inviterId: string
      projectId: string
      role?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS)

    const [invitation] = await db
      .insert(projectInvitations)
      .values({
        email: data.email,
        expiresAt,
        inviterId: data.inviterId,
        projectId: data.projectId,
        role: data.role ?? 'viewer',
      })
      .returning()

    const project = await db.query.projects.findFirst({
      where: eq(projects.id, data.projectId),
    })

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, data.inviterId),
    })

    if (invitation) {
      const baseUrl = process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3000'

      await sendMail({
        subject: `You've been invited to project ${project?.name ?? data.projectId}`,
        template: ProjectInvite({
          inviterName: inviter?.name,
          projectName: project?.name ?? data.projectId,
          role: invitation.role,
          url: `${baseUrl}/invite/project/${invitation.id}`,
        }),
        to: data.email,
      })
    }

    return invitation
  })

export const getProjectInvitations = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db
      .select({
        createdAt: projectInvitations.createdAt,
        email: projectInvitations.email,
        expiresAt: projectInvitations.expiresAt,
        id: projectInvitations.id,
        role: projectInvitations.role,
        status: projectInvitations.status,
      })
      .from(projectInvitations)
      .where(
        and(
          eq(projectInvitations.projectId, projectId),
          eq(projectInvitations.status, 'pending'),
        ),
      )
      .orderBy(desc(projectInvitations.createdAt))
  })

export const cancelProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string }) => d)
  .handler(async ({ data }) => {
    await db
      .update(projectInvitations)
      .set({ status: 'cancelled' })
      .where(eq(projectInvitations.id, data.invitationId))

    return { ok: true }
  })

export const acceptProjectInvitation = createServerFn({ method: 'POST' })
  .inputValidator((d: { invitationId: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const invitation = await db.query.projectInvitations.findFirst({
      where: eq(projectInvitations.id, data.invitationId),
    })

    if (!invitation) return { error: 'Invitation not found' }
    if (invitation.status !== 'pending') return { error: 'Invitation expired' }
    if (new Date() > invitation.expiresAt)
      return { error: 'Invitation expired' }

    await db
      .insert(projectMembers)
      .values({
        projectId: invitation.projectId,
        role: invitation.role,
        userId: data.userId,
      })
      .onConflictDoNothing()

    await db
      .update(projectInvitations)
      .set({ status: 'accepted' })
      .where(eq(projectInvitations.id, data.invitationId))

    return { ok: true, projectId: invitation.projectId }
  })

export const getProjectInvitationById = createServerFn({ method: 'GET' })
  .inputValidator((invitationId: string) => invitationId)
  .handler(async ({ data: invitationId }) => {
    const invitation = await db.query.projectInvitations.findFirst({
      where: eq(projectInvitations.id, invitationId),
      with: { project: true },
    })

    return invitation ?? null
  })

// --- Service Members ---

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

// --- Service Invitations ---

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

// --- Services ---

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

export const deleteService = createServerFn({ method: 'POST' })
  .inputValidator((d: { serviceId: string }) => d)
  .handler(async ({ data }) => {
    await db.delete(services).where(eq(services.id, data.serviceId))

    return { ok: true }
  })

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

/** Search users by email for adding to projects. */
export const searchUsers = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    if (data.query.length < 2) return []

    return db
      .select({ email: users.email, id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.email} ILIKE ${'%' + data.query + '%'}`)
      .limit(10)
  })

// --- Feature Flags ---

/** Fetch all feature flags for a service. */
export const getFeatureFlags = createServerFn({ method: 'GET' })
  .inputValidator((serviceId: string) => serviceId)
  .handler(async ({ data: serviceId }) => {
    return db.query.featureFlags.findMany({
      orderBy: [desc(featureFlags.createdAt)],
      where: eq(featureFlags.serviceId, serviceId),
    })
  })

// --- Service Config ---

/** Update service tracking settings (errors, events, feature flags). */
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

// --- Excluded Devices ---

/** Fetch the list of excluded visitor hashes for a service. */
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
