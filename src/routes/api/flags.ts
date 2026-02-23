import type { FeatureFlagConditions } from '~/lib/db/schema'

import { createFileRoute } from '@tanstack/react-router'
import { and, eq } from 'drizzle-orm'

import { db } from '~/lib/db'
import { featureFlags, sessions } from '~/lib/db/schema'
import { resolveTenant } from '~/lib/tenant'

const corsHeaders = {
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

export const Route = createFileRoute('/api/flags')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const key = url.searchParams.get('key')
          const sessionId = url.searchParams.get('sid')

          if (!key) {
            return Response.json(
              { error: 'Missing key parameter' },
              { headers: corsHeaders, status: 400 },
            )
          }

          const host = request.headers.get('host') ?? 'localhost'
          const tenant = await resolveTenant(host)

          if (!tenant.projectId && !tenant.isAdmin) {
            return Response.json({ enabled: false }, { headers: corsHeaders })
          }

          const projectId = tenant.projectId
          if (!projectId) {
            return Response.json({ enabled: false }, { headers: corsHeaders })
          }

          const flag = await db.query.featureFlags.findFirst({
            where: and(
              eq(featureFlags.projectId, projectId),
              eq(featureFlags.key, key),
            ),
          })

          if (!flag) {
            return Response.json(
              { enabled: false, error: 'Flag not found' },
              { headers: corsHeaders, status: 404 },
            )
          }

          if (!flag.enabled) {
            return Response.json({ enabled: false }, { headers: corsHeaders })
          }

          const conditions = flag.conditions

          if (!conditions) {
            return Response.json({ enabled: true }, { headers: corsHeaders })
          }

          const enabled = await evaluateConditions({
            conditions,
            sessionId,
          })

          return Response.json({ enabled }, { headers: corsHeaders })
        } catch (err) {
          console.error('Flags error:', err)
          return Response.json(
            { enabled: false },
            { headers: corsHeaders, status: 500 },
          )
        }
      },

      OPTIONS: () => {
        return new Response(null, { headers: corsHeaders, status: 204 })
      },
    },
  },
})

const evaluateConditions = async ({
  conditions,
  sessionId,
}: {
  conditions: FeatureFlagConditions
  sessionId: null | string
}): Promise<boolean> => {
  if (conditions.percentage !== undefined) {
    const hash = sessionId
      ? Array.from(sessionId).reduce((acc, c) => acc + c.charCodeAt(0), 0) % 100
      : Math.random() * 100
    if (hash >= conditions.percentage) return false
  }

  if (
    sessionId &&
    (conditions.countries?.length || conditions.deviceTypes?.length)
  ) {
    const session = await db.query.sessions.findFirst({
      columns: { countryCode: true, deviceType: true },
      where: eq(sessions.id, sessionId),
    })

    if (session) {
      if (
        conditions.countries?.length &&
        session.countryCode &&
        !conditions.countries.includes(session.countryCode)
      ) {
        return false
      }

      if (
        conditions.deviceTypes?.length &&
        !conditions.deviceTypes.includes(session.deviceType)
      ) {
        return false
      }
    }
  }

  return true
}
