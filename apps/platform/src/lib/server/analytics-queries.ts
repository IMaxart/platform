import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  excludedDevices,
  pageViews,
  visitorSessions,
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
  ilike,
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

// ── Overview Stats ──

type OverviewParams = {
  serviceId: string
  showExcluded?: boolean
}

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

// ── Top Pages / Referrers / Countries ──

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

// ── Events ──

export const getEvents = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      days: number
      limit?: number
      nameFilter?: string
      offset?: number
      serviceId: string
    }) => d,
  )
  .handler(
    async ({
      data: { days, limit = 50, nameFilter, offset = 0, serviceId },
    }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const conditions = [
        eq(events.serviceId, serviceId),
        gte(events.createdAt, startDate),
        nameFilter !== undefined
          ? ilike(events.name, `%${nameFilter}%`)
          : undefined,
      ].filter(Boolean)

      return db
        .select({
          count: count(),
          lastSeen: sql<string>`MAX(${events.createdAt})`.as('last_seen'),
          name: events.name,
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(events.name)
        .orderBy(desc(count()))
        .limit(limit)
        .offset(offset)
    },
  )

export const getEventStats = createServerFn({ method: 'GET' })
  .inputValidator((d: { days: number; serviceId: string }) => d)
  .handler(async ({ data: { days, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const conditions = [
      eq(events.serviceId, serviceId),
      gte(events.createdAt, startDate),
    ]

    const [total, uniqueNames] = await Promise.all([
      db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions)),
      db
        .select({ count: countDistinct(events.name) })
        .from(events)
        .where(and(...conditions)),
    ])

    return {
      totalEvents: total[0]?.count ?? 0,
      uniqueNames: uniqueNames[0]?.count ?? 0,
    }
  })

export const getEventTimeline = createServerFn({ method: 'GET' })
  .inputValidator((d: { days: number; serviceId: string }) => d)
  .handler(async ({ data: { days, serviceId } }) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    return db
      .select({
        count: count(),
        date: sql<string>`DATE(${events.createdAt})`.as('date'),
      })
      .from(events)
      .where(
        and(eq(events.serviceId, serviceId), gte(events.createdAt, startDate)),
      )
      .groupBy(sql`DATE(${events.createdAt})`)
      .orderBy(sql`DATE(${events.createdAt})`)
  })

export const getEventDetail = createServerFn({ method: 'GET' })
  .inputValidator(
    (d: {
      days: number
      limit?: number
      name: string
      offset?: number
      serviceId: string
    }) => d,
  )
  .handler(
    async ({ data: { days, limit = 50, name, offset = 0, serviceId } }) => {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      return db
        .select({
          createdAt: events.createdAt,
          id: events.id,
          path: events.path,
          properties: events.properties,
        })
        .from(events)
        .where(
          and(
            eq(events.serviceId, serviceId),
            eq(events.name, name),
            gte(events.createdAt, startDate),
          ),
        )
        .orderBy(desc(events.createdAt))
        .limit(limit)
        .offset(offset)
    },
  )

// ── Sessions ──

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

// ── Console Errors ──

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
