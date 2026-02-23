import type { PublicPageResponse } from '~/shared/api-types'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'

import { StatusBadge } from '~/components/status/status-badge'
import { bucketChecks } from '~/components/status/timeline'

type PublicMode = Extract<PublicPageResponse, { mode: 'public' }>

const formatPercent = ({ value }: { value: null | number }) => {
  if (value === null) return '—'
  return `${value.toFixed(3)}%`
}

const colorClass = ({
  state,
}: {
  state: 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'UP'
}) => {
  if (state === 'UP') return 'bg-emerald-500'
  if (state === 'DEGRADED') return 'bg-amber-500'
  if (state === 'DOWN') return 'bg-red-600'
  return 'bg-muted'
}

const Timeline = ({
  endMs,
  points,
}: {
  endMs: number
  points: { atMs: number; degraded: 0 | 1; ok: 0 | 1; }[]
}) => {
  const startMs = endMs - 24 * 60 * 60 * 1000
  const bucketMs = 5 * 60 * 1000
  const buckets = bucketChecks({ bucketMs, endMs, points, startMs })

  return (
    <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-1">
      {Array.from({ length: 24 }, (_, hourIdx) => {
        const startIdx = hourIdx * 12
        const hourBuckets = buckets.slice(startIdx, startIdx + 12)
        return (
          <div className="grid grid-cols-12 gap-1" key={hourIdx}>
            {hourBuckets.map((state, idx) => (
              <div
                className={`h-2 w-full rounded-sm ${colorClass({ state })}`}
                key={`${hourIdx}-${idx}`}
                title={state}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}

export const PublicStatusPage = ({ data }: { data: PublicMode }) => {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {data.service.name}
          </h1>
          <div className="text-muted-foreground text-sm">{data.host}</div>
          <div className="text-muted-foreground mt-1 text-xs">
            Last deploy:{' '}
            {data.deploy?.lastDeployedAtMs
              ? new Date(data.deploy.lastDeployedAtMs).toLocaleString()
              : '—'}
          </div>
        </div>
        <StatusBadge state={data.serviceState} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Uptime 24h</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent({ value: data.serviceUptime.last24h })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uptime 90d</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent({ value: data.serviceUptime.last90d })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Uptime 365d</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatPercent({ value: data.serviceUptime.last365d })}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="grid gap-4">
          {data.endpoints.map((endpoint) => {
            const points = data.checks24hByEndpointId[endpoint.id] ?? []
            const state = endpoint.latest?.state ?? 'UNKNOWN'
            const lastCheckedAt =
              endpoint.latest?.atMs === undefined
                ? '—'
                : new Date(endpoint.latest.atMs).toLocaleString()

            return (
              <Card key={endpoint.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle>{endpoint.displayName}</CardTitle>
                    <div className="text-muted-foreground mt-1 text-xs">
                      Last check: {lastCheckedAt}
                      {endpoint.latest?.latencyMs === null ||
                      endpoint.latest?.latencyMs === undefined
                        ? ''
                        : ` • ${endpoint.latest.latencyMs}ms`}
                    </div>
                  </div>
                  <StatusBadge state={state} />
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="text-sm">
                      <div className="text-muted-foreground">Uptime 24h</div>
                      <div className="font-semibold">
                        {formatPercent({ value: endpoint.uptime.last24h })}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Uptime 90d</div>
                      <div className="font-semibold">
                        {formatPercent({ value: endpoint.uptime.last90d })}
                      </div>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted-foreground">Uptime 365d</div>
                      <div className="font-semibold">
                        {formatPercent({ value: endpoint.uptime.last365d })}
                      </div>
                    </div>
                  </div>
                  <Timeline endMs={data.nowMs} points={points} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>
    </main>
  )
}
