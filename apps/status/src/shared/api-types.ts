import type { CheckState, EndpointRow, ServiceRow } from '~/server/types'

export type DokployRefType = 'application' | 'compose'

export type PublicPageResponse =
  | {
      checks24hByEndpointId: Record<
        string,
        {
          atMs: number
          degraded: 0 | 1
          latencyMs: null | number
          ok: 0 | 1
        }[]
      >
      deploy: null | { lastDeployedAtMs: null | number }
      endpoints: (EndpointRow & {
        latest: null | {
          atMs: number
          errorKind: null | string
          latencyMs: null | number
          state: CheckState
          statusCode: null | number
        }
        uptime: {
          last24h: null | number
          last90d: null | number
          last365d: null | number
        }
      })[]
      host: string
      mode: 'public'
      nowMs: number
      service: ServiceRow
      serviceState: CheckState
      serviceUptime: {
        last24h: UptimeBreakdown
        last90d: UptimeBreakdown
        last365d: UptimeBreakdown
      }
    }
  | {
      host: string
      mode: 'notFound'
    }

export type UptimeBreakdown = null | {
  degradedPct: number
  downPct: number
  upPct: number
}
