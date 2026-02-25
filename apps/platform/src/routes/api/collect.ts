import { db } from '@platform/db'
import {
  consoleErrors,
  events,
  pageViews,
  services,
  visitorSessions,
} from '@platform/db/schema'
import type { CollectPayload } from '@platform/shared/validation'
import { collectBatchSchema } from '@platform/shared/validation'
import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'

import { detectBot } from '~/lib/bot-detection'
import { lookupGeo } from '~/lib/geo'
import { hashIP } from '~/lib/ip-hash'
import { resolveTenant } from '~/lib/tenant'

const getClientIP = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded !== null) {
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

          let serviceId = tenant.serviceId

          if (tenant.isAdmin) {
            const origin = request.headers.get('origin') ?? ''
            const originHost = origin ? new URL(origin).hostname : ''

            if (originHost) {
              const service = await db.query.services.findFirst({
                columns: { id: true },
                where: eq(services.domain, originHost),
              })
              serviceId = service?.id ?? null
            }
          }

          if (serviceId === null) {
            const fallback = await db.query.services.findFirst({
              columns: { id: true },
            })
            serviceId = fallback?.id ?? null
          }

          if (serviceId === null) {
            return Response.json(
              { error: 'Service not found' },
              { headers: corsHeaders, status: 404 },
            )
          }

          const service = await db.query.services.findFirst({
            columns: {
              analyticsEnabled: true,
              id: true,
              salt: true,
              trackErrors: true,
              trackEvents: true,
            },
            where: eq(services.id, serviceId),
          })

          if (service?.analyticsEnabled !== true) {
            return Response.json(
              { error: 'Service not found or analytics disabled' },
              { headers: corsHeaders, status: 404 },
            )
          }

          const body: unknown =
            request.headers
              .get('content-type')
              ?.includes('application/json') === true
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
            salt: service.salt ?? '',
            userAgent,
          })
          const isBot = detectBot(userAgent)
          const geo = lookupGeo(ip, request.headers)

          await processPayloads({
            geo,
            isBot,
            payloads: parsed.data,
            serviceConfig: {
              trackErrors: service.trackErrors,
              trackEvents: service.trackEvents,
            },
            serviceId: service.id,
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
  serviceConfig,
  serviceId,
  visitorHash,
}: {
  geo: {
    city: null | string
    countryCode: null | string
    region: null | string
  }
  isBot: boolean
  payloads: CollectPayload[]
  serviceConfig: {
    trackErrors: boolean
    trackEvents: boolean
  }
  serviceId: string
  visitorHash: string
}) => {
  for (const payload of payloads) {
    switch (payload.type) {
      case 'error': {
        if (!serviceConfig.trackErrors) break
        await db.insert(consoleErrors).values({
          columnNumber: payload.columnNumber,
          level: payload.level,
          lineNumber: payload.lineNumber,
          message: payload.message,
          path: payload.path,
          serviceId,
          sessionId: payload.sessionId,
          sourceUrl: payload.sourceUrl,
          stack: payload.stack,
        })
        break
      }

      case 'event': {
        if (!serviceConfig.trackEvents) break
        await db.insert(events).values({
          name: payload.name,
          path: payload.path,
          properties: payload.properties as
            | Record<string, boolean | null | number | string>
            | undefined,
          serviceId,
          sessionId: payload.sessionId,
        })
        break
      }

      case 'pageview': {
        await db.insert(pageViews).values({
          durationMs: payload.durationMs,
          enteredAt: new Date(payload.enteredAt),
          path: payload.path,
          referrer: payload.referrer,
          scrollDepthPct: payload.scrollDepthPct,
          serviceId,
          sessionId: payload.sessionId,
          title: payload.title,
        })
        break
      }

      case 'session': {
        const existing = await db.query.visitorSessions.findFirst({
          columns: { id: true },
          where: eq(visitorSessions.id, payload.sessionId),
        })

        if (!existing) {
          await db.insert(visitorSessions).values({
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
            referrer: payload.referrer,
            region: geo.region,
            screenHeight: payload.device.screenHeight,
            screenWidth: payload.device.screenWidth,
            serviceId,
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
