import type { CollectPayload } from '@platform/shared/validation'

import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  pageViews,
  projects,
  sessions,
} from '@platform/db/schema'
import { collectBatchSchema } from '@platform/shared/validation'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { detectBot } from '~/lib/bot-detection'
import { lookupGeo } from '~/lib/geo'
import { hashIP } from '~/lib/ip-hash'
import { resolveTenant } from '~/lib/tenant'

const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? '0.0.0.0'
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    '0.0.0.0'
  )
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

export const Route = createFileRoute('/api/collect')({
  server: {
    handlers: {
      OPTIONS: () => {
        return new Response(null, { headers: corsHeaders, status: 204 })
      },

      POST: async ({ request }) => {
        try {
          const host = request.headers.get('host') ?? 'localhost'
          const tenant = await resolveTenant(host)

          let projectId = tenant.projectId

          if (tenant.isAdmin) {
            const origin = request.headers.get('origin') ?? ''
            const originHost = origin ? new URL(origin).hostname : ''

            if (originHost) {
              const project = await db.query.projects.findFirst({
                columns: { id: true },
                where: eq(projects.domain, originHost),
              })
              projectId = project?.id ?? null
            }
          }

          if (!projectId) {
            const allProjects = await db.query.projects.findFirst({
              columns: { id: true },
            })
            projectId = allProjects?.id ?? null
          }

          if (!projectId) {
            return Response.json(
              { error: 'Project not found' },
              { headers: corsHeaders, status: 404 },
            )
          }

          const project = await db.query.projects.findFirst({
            columns: {
              id: true,
              salt: true,
              trackErrors: true,
              trackEvents: true,
              trackFeatureFlags: true,
            },
            where: eq(projects.id, projectId),
          })

          if (!project) {
            return Response.json(
              { error: 'Project not found' },
              { headers: corsHeaders, status: 404 },
            )
          }

          const body: unknown = request.headers
            .get('content-type')
            ?.includes('application/json')
            ? ((await request.json()) as unknown)
            : (JSON.parse(await request.text()) as unknown)

          const parsed = collectBatchSchema.safeParse(body)

          if (!parsed.success) {
            return Response.json(
              { error: 'Invalid payload' },
              { headers: corsHeaders, status: 400 },
            )
          }

          const ip = getClientIP(request)
          const userAgent = request.headers.get('user-agent') ?? ''
          const visitorHash = hashIP({
            ip,
            salt: project.salt,
            userAgent,
          })
          const isBot = detectBot(userAgent)
          const geo = lookupGeo(ip, request.headers)

          await processPayloads({
            geo,
            isBot,
            payloads: parsed.data,
            projectConfig: {
              trackErrors: project.trackErrors,
              trackEvents: project.trackEvents,
            },
            projectId: project.id,
            visitorHash,
          })

          return Response.json(
            { ok: true },
            { headers: corsHeaders, status: 200 },
          )
        } catch (err) {
          console.error('Collect error:', err)
          return Response.json(
            { error: 'Internal server error' },
            { headers: corsHeaders, status: 500 },
          )
        }
      },
    },
  },
})

const processPayloads = async ({
  geo,
  isBot,
  payloads,
  projectConfig,
  projectId,
  visitorHash,
}: {
  geo: {
    city: null | string
    countryCode: null | string
    region: null | string
  }
  isBot: boolean
  payloads: CollectPayload[]
  projectConfig: {
    trackErrors: boolean
    trackEvents: boolean
  }
  projectId: string
  visitorHash: string
}) => {
  for (const payload of payloads) {
    switch (payload.type) {
      case 'error': {
        if (!projectConfig.trackErrors) break
        await db.insert(consoleErrors).values({
          columnNumber: payload.columnNumber,
          level: payload.level,
          lineNumber: payload.lineNumber,
          message: payload.message,
          path: payload.path,
          projectId,
          sessionId: payload.sessionId,
          sourceUrl: payload.sourceUrl,
          stack: payload.stack,
        })
        break
      }

      case 'event': {
        if (!projectConfig.trackEvents) break
        await db.insert(events).values({
          name: payload.name,
          path: payload.path,
          projectId,
          properties: payload.properties as
            | Record<string, boolean | null | number | string>
            | undefined,
          sessionId: payload.sessionId,
        })
        break
      }

      case 'pageview': {
        await db.insert(pageViews).values({
          durationMs: payload.durationMs,
          enteredAt: new Date(payload.enteredAt),
          path: payload.path,
          projectId,
          referrer: payload.referrer,
          scrollDepthPct: payload.scrollDepthPct,
          sessionId: payload.sessionId,
          title: payload.title,
        })
        break
      }

      case 'session': {
        const existing = await db.query.sessions.findFirst({
          columns: { id: true },
          where: eq(sessions.id, payload.sessionId),
        })

        if (!existing) {
          await db.insert(sessions).values({
            browserName: payload.device.browserName,
            browserVersion: payload.device.browserVersion,
            city: geo.city,
            countryCode: geo.countryCode,
            deviceType: payload.device.deviceType,
            environment: payload.environment,
            id: payload.sessionId,
            isBot,
            language: payload.device.language,
            osName: payload.device.osName,
            osVersion: payload.device.osVersion,
            projectId,
            referrer: payload.referrer,
            region: geo.region,
            screenHeight: payload.device.screenHeight,
            screenWidth: payload.device.screenWidth,
            timezone: payload.device.timezone,
            utmCampaign: payload.utmCampaign,
            utmContent: payload.utmContent,
            utmMedium: payload.utmMedium,
            utmSource: payload.utmSource,
            utmTerm: payload.utmTerm,
            visitorHash,
          })
        }
        break
      }
    }
  }
}
