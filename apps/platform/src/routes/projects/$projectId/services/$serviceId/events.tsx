import { Badge } from '@platform/ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Input } from '@platform/ui/components/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui/components/table'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronRight,
  Hash,
  Loader2,
  MousePointerClick,
  Search,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { StatCard } from '~/components/dashboard/stat-card'
import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import {
  getEventDetail,
  getEvents,
  getEventStats,
  getEventTimeline,
} from '~/lib/server/analytics-queries'
import * as m from '~/paraglide/messages'

type EventDetailRow = {
  createdAt: Date
  id: string
  path: null | string
  properties: null | Record<string, boolean | null | number | string>
}

type EventExpandableRowProps = {
  days: number
  event: EventRow
  expandedEvent: null | string
  onToggle: (name: null | string) => void
  serviceId: string
}

type EventRow = {
  count: number
  lastSeen: string
  name: string
}

type EventTimelineRow = {
  count: number
  date: string
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/events',
)({
  component: EventsPage,
})

function EventsPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/events',
  })
  const [days, setDays] = useState('30')
  const [search, setSearch] = useState('')
  const [expandedEvent, setExpandedEvent] = useState<null | string>(null)
  const daysNum = Number(days)

  const statsQuery = useQuery({
    queryFn: () =>
      getEventStats({ data: { days: daysNum, serviceId } }) as Promise<{
        totalEvents: number
        uniqueNames: number
      }>,
    queryKey: ['eventStats', serviceId, daysNum],
  })

  const timelineQuery = useQuery<EventTimelineRow[]>({
    queryFn: () =>
      getEventTimeline({
        data: { days: daysNum, serviceId },
      }) as Promise<EventTimelineRow[]>,
    queryKey: ['eventTimeline', serviceId, daysNum],
  })

  const eventsQuery = useQuery<EventRow[]>({
    queryFn: () =>
      getEvents({
        data: {
          days: daysNum,
          serviceId,
          ...(search.length > 0 ? { nameFilter: search } : {}),
        },
      }) as Promise<EventRow[]>,
    queryKey: ['events', serviceId, daysNum, search],
  })

  return (
    <>
      <Header title={m.events_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={<MousePointerClick className="h-4 w-4" />}
            title={m.events_totalEvents()}
            value={statsQuery.data?.totalEvents ?? '—'}
          />
          <StatCard
            icon={<Tag className="h-4 w-4" />}
            title={m.events_uniqueTypes()}
            value={statsQuery.data?.uniqueNames ?? '—'}
          />
        </div>

        {(timelineQuery.data?.length ?? 0) > 0 ? (
          <EventTimelineChart data={timelineQuery.data ?? []} />
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>{m.events_title()}</CardTitle>
            <div className="relative w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                onChange={(e) => {
                  setSearch(e.target.value)
                }}
                placeholder={m.events_searchPlaceholder()}
                value={search}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>{m.events_name()}</TableHead>
                    <TableHead className="text-right">
                      {m.events_count()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.events_lastSeen()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsQuery.isLoading ? (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={4}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : eventsQuery.data && eventsQuery.data.length > 0 ? (
                    eventsQuery.data.map((event) => (
                      <EventExpandableRow
                        days={daysNum}
                        event={event}
                        expandedEvent={expandedEvent}
                        key={event.name}
                        onToggle={setExpandedEvent}
                        serviceId={serviceId}
                      />
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={4}>
                        <MousePointerClick className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {m.events_noDataDescription()}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

const EventExpandableRow = ({
  days,
  event,
  expandedEvent,
  onToggle,
  serviceId,
}: EventExpandableRowProps) => {
  const isExpanded = expandedEvent === event.name

  const detailQuery = useQuery<EventDetailRow[]>({
    enabled: isExpanded,
    queryFn: () =>
      getEventDetail({
        data: { days, name: event.name, serviceId },
      }) as Promise<EventDetailRow[]>,
    queryKey: ['eventDetail', serviceId, days, event.name],
  })

  return (
    <>
      <TableRow
        className="cursor-pointer"
        onClick={() => {
          onToggle(isExpanded ? null : event.name)
        }}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <Badge className="font-mono" variant="secondary">
            {event.name}
          </Badge>
        </TableCell>
        <TableCell className="text-right">{event.count}</TableCell>
        <TableCell className="text-muted-foreground text-right text-sm">
          {new Date(event.lastSeen).toLocaleString()}
        </TableCell>
      </TableRow>
      {isExpanded ? (
        <TableRow>
          <TableCell className="bg-muted/30 p-4" colSpan={4}>
            {detailQuery.isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
              </div>
            ) : detailQuery.data && detailQuery.data.length > 0 ? (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">
                  {m.events_occurrences()} ({detailQuery.data.length})
                </h4>
                <div className="divide-border divide-y rounded-md border">
                  {detailQuery.data.map((detail) => (
                    <EventDetailItem detail={detail} key={detail.id} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground py-4 text-center text-sm">
                {m.common_noData()}
              </p>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

const EventDetailItem = ({ detail }: { detail: EventDetailRow }) => {
  const properties = detail.properties
  const hasProperties =
    properties !== null && Object.keys(properties).length > 0

  return (
    <div className="flex flex-col gap-2 px-4 py-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-xs">
            {new Date(detail.createdAt).toLocaleString()}
          </span>
          {detail.path !== null ? (
            <span className="text-muted-foreground flex items-center gap-1 font-mono text-xs">
              <Hash className="h-3 w-3" />
              {detail.path}
            </span>
          ) : null}
        </div>
      </div>
      {hasProperties ? (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(properties).map(([key, value]) => (
            <Badge className="font-mono text-xs" key={key} variant="outline">
              {key}: {String(value)}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

const EventTimelineChart = ({ data }: { data: EventTimelineRow[] }) => (
  <Card className="transition-all duration-300 ease-out">
    <CardHeader className="pb-4">
      <CardTitle className="text-base font-medium">
        {m.events_timeline()}
      </CardTitle>
    </CardHeader>
    <CardContent className="pb-6">
      <div className="h-[200px]">
        <ResponsiveContainer height="100%" width="100%">
          <BarChart
            data={data}
            margin={{ bottom: 0, left: -8, right: 8, top: 4 }}
          >
            <CartesianGrid
              className="stroke-border/50"
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              className="text-xs"
              dataKey="date"
              dy={8}
              tickFormatter={(v: string) =>
                new Date(v).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                })
              }
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              className="text-xs"
              dx={-4}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backdropFilter: 'blur(8px)',
                backgroundColor: 'var(--color-popover)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                color: 'var(--color-popover-foreground)',
                fontSize: '13px',
              }}
              cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
            />
            <Bar
              dataKey="count"
              fill="var(--color-primary)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
)
