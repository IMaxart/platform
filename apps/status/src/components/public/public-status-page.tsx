import { Card, CardContent } from '@platform/ui/components/card'
import { Skeleton } from '@platform/ui/components/skeleton'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@platform/ui/components/tooltip'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { bucketChecks } from '~/components/status/timeline'
import * as m from '~/paraglide/messages'
import type { CheckState } from '~/server/types'
import type { PublicPageResponse } from '~/shared/api-types'

type PublicMode = Extract<PublicPageResponse, { mode: 'public' }>

const formatPercent = ({ value }: { value: null | number }) => {
  if (value === null) return '—'
  return `${value.toFixed(2)}%`
}

const stateColor = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return 'bg-emerald-500'
  if (state === 'DEGRADED') return 'bg-amber-500'
  if (state === 'DOWN') return 'bg-red-500'
  return 'bg-muted-foreground/20'
}

const stateLabel = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return m.state_operational()
  if (state === 'DEGRADED') return m.state_degraded()
  if (state === 'DOWN') return m.state_down()
  return m.state_unknown()
}

const stateTextColor = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return 'text-emerald-600 dark:text-emerald-400'
  if (state === 'DEGRADED') return 'text-amber-600 dark:text-amber-400'
  if (state === 'DOWN') return 'text-red-600 dark:text-red-400'
  return 'text-muted-foreground'
}

const formatRelativeTime = ({ ms }: { ms: number }) => {
  const seconds = Math.floor((Date.now() - ms) / 1000)
  if (seconds < 60) return m.time_justNow()
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return m.time_minutesAgo({ count: String(minutes) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return m.time_hoursAgo({ count: String(hours) })
  const days = Math.floor(hours / 24)
  return m.time_daysAgo({ count: String(days) })
}

const OverallStatus = ({ state }: { state: CheckState }) => {
  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
      initial={{ opacity: 0, y: 4 }}
      transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
    >
      <span
        className={`inline-block h-3 w-3 rounded-full ${stateColor({ state })} shadow-sm`}
      />
      <span className={`text-lg font-medium ${stateTextColor({ state })}`}>
        {stateLabel({ state })}
      </span>
    </motion.div>
  )
}

const UptimeCard = ({
  delay,
  label,
  value,
}: {
  delay: number
  label: string
  value: null | number
}) => {
  const percent = value ?? 0
  const isGood = percent >= 99.9
  const isOk = percent >= 99 && !isGood

  const getBarColor = () => {
    if (value === null) return 'bg-muted'
    if (isGood) return 'bg-emerald-500'
    if (isOk) return 'bg-amber-500'
    return 'bg-red-500'
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 8 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="group transition-shadow duration-300 ease-out hover:shadow-md">
        <CardContent className="space-y-3 p-6">
          <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            {label}
          </p>
          <p className="text-3xl font-semibold tracking-tight tabular-nums">
            {formatPercent({ value })}
          </p>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <motion.div
              animate={{
                width: value !== null ? `${Math.min(100, percent)}%` : '0%',
              }}
              className={`h-full rounded-full ${getBarColor()}`}
              initial={{ width: '0%' }}
              transition={{
                delay: delay + 0.2,
                duration: 0.6,
                ease: 'easeOut',
              }}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

const Timeline = ({
  endMs,
  points,
}: {
  endMs: number
  points: { atMs: number; degraded: 0 | 1; ok: 0 | 1 }[]
}) => {
  const startMs = endMs - 24 * 60 * 60 * 1000
  const bucketMs = 5 * 60 * 1000
  const buckets = bucketChecks({ bucketMs, endMs, points, startMs })
  const [hoveredIdx, setHoveredIdx] = useState<null | number>(null)

  return (
    <div className="space-y-2">
      <div className="flex gap-[1px]">
        {buckets.map((state, idx) => {
          const bucketStartMs = startMs + idx * bucketMs
          const time = new Date(bucketStartMs)
          const timeStr = time.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })

          return (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <div
                  className={`h-8 flex-1 rounded-[2px] transition-all duration-150 ${stateColor({ state })} ${
                    hoveredIdx === idx
                      ? 'scale-y-110 opacity-100'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  onMouseEnter={() => {
                    setHoveredIdx(idx)
                  }}
                  onMouseLeave={() => {
                    setHoveredIdx(null)
                  }}
                />
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs font-medium">
                  {timeStr} — {stateLabel({ state })}
                </p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <div className="text-muted-foreground flex justify-between text-[10px]">
        <span>{m.time_24hAgo()}</span>
        <span>{m.time_now()}</span>
      </div>
    </div>
  )
}

const EndpointCard = ({
  checks,
  delay,
  endpoint,
  nowMs,
}: {
  checks: { atMs: number; degraded: 0 | 1; ok: 0 | 1 }[]
  delay: number
  endpoint: PublicMode['endpoints'][number]
  nowMs: number
}) => {
  const state = endpoint.latest?.state ?? 'UNKNOWN'
  const atMs = endpoint.latest?.atMs
  const lastChecked =
    atMs !== undefined ? formatRelativeTime({ ms: atMs }) : null
  const latencyMs = endpoint.latest?.latencyMs ?? null

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 12 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    >
      <Card className="group transition-all duration-300 ease-out hover:shadow-md">
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold tracking-tight">
                {endpoint.displayName}
              </h3>
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                {lastChecked !== null ? (
                  <span>{m.checked_ago({ time: lastChecked })}</span>
                ) : null}
                {latencyMs !== null ? (
                  <span className="tabular-nums">{latencyMs}ms</span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${stateColor({ state })}`}
              />
              <span
                className={`text-sm font-medium ${stateTextColor({ state })}`}
              >
                {stateLabel({ state })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                24h
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatPercent({ value: endpoint.uptime.last24h })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                90d
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatPercent({ value: endpoint.uptime.last90d })}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                365d
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">
                {formatPercent({ value: endpoint.uptime.last365d })}
              </p>
            </div>
          </div>

          <Timeline endMs={nowMs} points={checks} />
        </CardContent>
      </Card>
    </motion.div>
  )
}

export const PublicStatusPageSkeleton = () => {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12 md:px-8">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-4 p-6">
              <div className="flex justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-8 w-full rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}

export const PublicStatusPage = ({ data }: { data: PublicMode }) => {
  const lastDeployedAtMs = data.deploy?.lastDeployedAtMs ?? null

  return (
    <AnimatePresence>
      <main className="mx-auto w-full max-w-3xl space-y-10 px-6 py-12 md:px-8">
        <motion.section
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {data.service.name}
              </h1>
            </div>
            <OverallStatus state={data.serviceState} />
          </div>
          {lastDeployedAtMs !== null ? (
            <p className="text-muted-foreground/60 text-xs">
              {m.lastDeployed_ago({
                time: formatRelativeTime({ ms: lastDeployedAtMs }),
              })}
            </p>
          ) : null}
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-3">
          <UptimeCard
            delay={0.15}
            label={m.uptime_24h()}
            value={data.serviceUptime.last24h}
          />
          <UptimeCard
            delay={0.25}
            label={m.uptime_90d()}
            value={data.serviceUptime.last90d}
          />
          <UptimeCard
            delay={0.35}
            label={m.uptime_365d()}
            value={data.serviceUptime.last365d}
          />
        </section>

        <section className="space-y-4">
          {data.endpoints.map((endpoint, idx) => (
            <EndpointCard
              checks={data.checks24hByEndpointId[endpoint.id] ?? []}
              delay={0.3 + idx * 0.08}
              endpoint={endpoint}
              key={endpoint.id}
              nowMs={data.nowMs}
            />
          ))}
        </section>
      </main>
    </AnimatePresence>
  )
}
