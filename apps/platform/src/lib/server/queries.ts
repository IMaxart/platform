import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  excludedDevices,
  featureFlags,
  pageViews,
  projects,
  sessions,
} from '@platform/db/schema'
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

const getExcludedHashes = async (projectId: string): Promise<string[]> => {
  const excluded = await db
    .select({ visitorHash: excludedDevices.visitorHash })
    .from(excludedDevices)
    .where(eq(excludedDevices.projectId, projectId))

  return excluded.map((e) => e.visitorHash)
}

const excludeCondition = (excludedHashes: string[], showExcluded: boolean) => {
  if (showExcluded || excludedHashes.length === 0) return undefined
  return not(inArray(sessions.visitorHash, excludedHashes))
}

// --- Projects ---

/** Fetch all projects ordered by creation date. */
export const getProjects = createServerFn({ method: 'GET' }).handler(
  async () => {
    return db.query.projects.findMany({
      orderBy: [desc(projects.createdAt)],
    })
  },
)

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
  projectId: string
  showExcluded?: boolean
}

/** Fetch visitor stats: today, yesterday, last 7/30/365 days, page views, avg duration. */
export const getVisitorStats = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams) => d)
  .handler(async ({ data: { projectId, showExcluded = false } }) => {
    const excludedHashes = await getExcludedHashes(projectId)
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
      eq(sessions.projectId, projectId),
      eq(sessions.isBot, false),
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
        .select({ count: countDistinct(sessions.visitorHash) })
        .from(sessions)
        .where(and(...baseConditions, gte(sessions.startedAt, todayStart))),
      db
        .select({ count: countDistinct(sessions.visitorHash) })
        .from(sessions)
        .where(
          and(
            ...baseConditions,
            gte(sessions.startedAt, yesterdayStart),
            lte(sessions.startedAt, todayStart),
          ),
        ),
      db
        .select({ count: countDistinct(sessions.visitorHash) })
        .from(sessions)
        .where(and(...baseConditions, gte(sessions.startedAt, day7Start))),
      db
        .select({ count: countDistinct(sessions.visitorHash) })
        .from(sessions)
        .where(and(...baseConditions, gte(sessions.startedAt, day30Start))),
      db
        .select({ count: countDistinct(sessions.visitorHash) })
        .from(sessions)
        .where(and(...baseConditions, gte(sessions.startedAt, yearStart))),
      db
        .select({ count: count() })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
            gte(pageViews.enteredAt, day30Start),
          ),
        ),
      db
        .select({ avg: avg(pageViews.durationMs) })
        .from(pageViews)
        .where(
          and(
            eq(pageViews.projectId, projectId),
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
  .handler(async ({ data: { days, projectId, showExcluded = false } }) => {
    const excludedHashes = await getExcludedHashes(projectId)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const excludeFilter = excludeCondition(excludedHashes, showExcluded)
    const conditions = [
      eq(sessions.projectId, projectId),
      eq(sessions.isBot, false),
      gte(sessions.startedAt, startDate),
      excludeFilter,
    ].filter(Boolean)

    const results = await db
      .select({
        date: sql<string>`DATE(${sessions.startedAt})`.as('date'),
        sessionCount: count(),
        visitors: countDistinct(sessions.visitorHash),
      })
      .from(sessions)
      .where(and(...conditions))
      .groupBy(sql`DATE(${sessions.startedAt})`)
      .orderBy(sql`DATE(${sessions.startedAt})`)

    return results
  })

/** Fetch top pages by views and unique visitors over the given days. */
export const getTopPages = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, projectId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        avgDurationMs: avg(pageViews.durationMs),
        path: pageViews.path,
        uniqueVisitors: countDistinct(sessions.visitorHash),
        views: count(),
      })
      .from(pageViews)
      .innerJoin(sessions, eq(pageViews.sessionId, sessions.id))
      .where(
        and(
          eq(pageViews.projectId, projectId),
          gte(pageViews.enteredAt, startDate),
          eq(sessions.isBot, false),
        ),
      )
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(limit)
  })

/** Fetch top referrers by unique visitor count over the given days. */
export const getTopReferrers = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, projectId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: countDistinct(sessions.visitorHash),
        referrer: sessions.referrer,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.projectId, projectId),
          gte(sessions.startedAt, startDate),
          eq(sessions.isBot, false),
          ne(sql`${sessions.referrer}`, ''),
        ),
      )
      .groupBy(sessions.referrer)
      .orderBy(desc(countDistinct(sessions.visitorHash)))
      .limit(limit)
  })

/** Fetch top countries by unique visitor count over the given days. */
export const getTopCountries = createServerFn({ method: 'GET' })
  .inputValidator((d: OverviewParams & { days: number; limit?: number }) => d)
  .handler(async ({ data: { days, limit = 10, projectId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: countDistinct(sessions.visitorHash),
        countryCode: sessions.countryCode,
      })
      .from(sessions)
      .where(
        and(
          eq(sessions.projectId, projectId),
          gte(sessions.startedAt, startDate),
          eq(sessions.isBot, false),
        ),
      )
      .groupBy(sessions.countryCode)
      .orderBy(desc(countDistinct(sessions.visitorHash)))
      .limit(limit)
  })

/** Fetch human vs bot session counts over the given days. */
export const getBotStats = createServerFn({ method: 'GET' })
  .inputValidator((d: { days: number; projectId: string }) => d)
  .handler(async ({ data: { days, projectId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [humans, bots] = await Promise.all([
      db
        .select({ count: count() })
        .from(sessions)
        .where(
          and(
            eq(sessions.projectId, projectId),
            gte(sessions.startedAt, startDate),
            eq(sessions.isBot, false),
          ),
        ),
      db
        .select({ count: count() })
        .from(sessions)
        .where(
          and(
            eq(sessions.projectId, projectId),
            gte(sessions.startedAt, startDate),
            eq(sessions.isBot, true),
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
    (d: { days: number; limit?: number; offset?: number; projectId: string }) =>
      d,
  )
  .handler(async ({ data: { days, limit = 50, offset = 0, projectId } }) => {
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
        and(eq(events.projectId, projectId), gte(events.createdAt, startDate)),
      )
      .groupBy(events.name)
      .orderBy(desc(count()))
      .limit(limit)
      .offset(offset)
  })

// --- Sessions ---

/** Fetch sessions with page views, events, and console errors for the given project and date range. */
export const getSessions = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      days: number
      limit?: number
      offset?: number
      projectId: string
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
        projectId,
        showBots = false,
        showExcluded = false,
      },
    }) => {
      const excludedHashes = await getExcludedHashes(projectId)
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conditions = [
        eq(sessions.projectId, projectId),
        gte(sessions.startedAt, startDate),
        showBots ? undefined : eq(sessions.isBot, false),
        excludeCondition(excludedHashes, showExcluded),
      ].filter(Boolean)

      return db.query.sessions.findMany({
        limit,
        offset,
        orderBy: [desc(sessions.startedAt)],
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
      projectId: string
    }) => d,
  )
  .handler(
    async ({ data: { days, level, limit = 50, offset = 0, projectId } }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conditions = [
        eq(consoleErrors.projectId, projectId),
        gte(consoleErrors.createdAt, startDate),
        level ? eq(consoleErrors.level, level) : undefined,
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

// --- Feature Flags ---

/** Fetch all feature flags for a project. */
export const getFeatureFlags = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db.query.featureFlags.findMany({
      orderBy: [desc(featureFlags.createdAt)],
      where: eq(featureFlags.projectId, projectId),
    })
  })

// --- Project Config ---

/** Update project tracking settings (errors, events, feature flags). */
export const updateProjectConfig = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      projectId: string
      trackErrors: boolean
      trackEvents: boolean
      trackFeatureFlags: boolean
    }) => d,
  )
  .handler(
    async ({
      data: { projectId, trackErrors, trackEvents, trackFeatureFlags },
    }) => {
      await db
        .update(projects)
        .set({ trackErrors, trackEvents, trackFeatureFlags })
        .where(eq(projects.id, projectId))

      return { ok: true }
    },
  )

// --- Excluded Devices ---

/** Fetch the list of excluded visitor hashes for a project. */
export const getExcludedDevicesList = createServerFn({ method: 'GET' })
  .inputValidator((projectId: string) => projectId)
  .handler(async ({ data: projectId }) => {
    return db.query.excludedDevices.findMany({
      orderBy: [desc(excludedDevices.createdAt)],
      where: eq(excludedDevices.projectId, projectId),
    })
  })
