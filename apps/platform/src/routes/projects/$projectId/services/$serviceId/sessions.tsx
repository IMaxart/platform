import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
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
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getSessions } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

type SessionData = {
  browserName: string
  consoleErrors: {
    id: string
    level: string
    message: string
  }[]
  countryCode: null | string
  deviceType: string
  endedAt: Date | null
  events: {
    id: string
    name: string
  }[]
  id: string
  isBot: boolean
  osName: string
  pageViews: {
    durationMs: null | number
    id: string
    path: string
  }[]
  startedAt: Date
  visitorHash: string
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/sessions',
)({
  component: SessionsPage,
})

const DeviceIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />
    case 'tablet':
      return <Tablet className="h-4 w-4" />
    default:
      return <Monitor className="h-4 w-4" />
  }
}

function SessionsPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/sessions',
  })
  const [days, setDays] = useState('7')
  const [expandedSession, setExpandedSession] = useState<null | string>(null)
  const daysNum = Number(days)

  const sessionsQuery = useQuery<SessionData[]>({
    queryFn: () =>
      getSessions({
        data: { days: daysNum, limit: 50, serviceId },
      }) as unknown as Promise<SessionData[]>,
    queryKey: ['sessions', serviceId, daysNum],
  })

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return '—'
    const ms = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <>
      <Header title={m.sessions_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.sessions_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>{m.sessions_visitor()}</TableHead>
                    <TableHead>{m.sessions_device()}</TableHead>
                    <TableHead>{m.sessions_location()}</TableHead>
                    <TableHead className="text-right">
                      {m.sessions_pagesViewed()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.sessions_duration()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.sessions_startedAt()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsQuery.isLoading ? (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={7}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : sessionsQuery.data && sessionsQuery.data.length > 0 ? (
                    sessionsQuery.data.map((session) => {
                      const isExpanded = expandedSession === session.id

                      return (
                        <>
                          <TableRow
                            className="cursor-pointer"
                            key={session.id}
                            onClick={() => {
                              setExpandedSession(isExpanded ? null : session.id)
                            }}
                          >
                            <TableCell>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {session.visitorHash.slice(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <DeviceIcon type={session.deviceType} />
                                <span className="text-sm">
                                  {session.browserName}{' '}
                                  <span className="text-muted-foreground">
                                    / {session.osName}
                                  </span>
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {session.countryCode ? (
                                <Badge variant="outline">
                                  {session.countryCode}
                                </Badge>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {session.pageViews.length}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatDuration(
                                session.startedAt,
                                session.endedAt,
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-right text-sm">
                              {new Date(session.startedAt).toLocaleString()}
                            </TableCell>
                          </TableRow>
                          {isExpanded ? (
                            <TableRow key={`${session.id}-detail`}>
                              <TableCell
                                className="bg-muted/30 p-4"
                                colSpan={7}
                              >
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="mb-2 text-sm font-medium">
                                      {m.sessions_timeline()}
                                    </h4>
                                    <div className="space-y-1">
                                      {session.pageViews.map((pv) => (
                                        <div
                                          className="flex items-center justify-between text-sm"
                                          key={pv.id}
                                        >
                                          <span className="font-mono text-xs">
                                            {pv.path}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {pv.durationMs
                                              ? `${Math.round(pv.durationMs / 1000)}s`
                                              : '—'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  {session.events.length > 0 ? (
                                    <div>
                                      <h4 className="mb-2 text-sm font-medium">
                                        {m.common_events()}
                                      </h4>
                                      <div className="flex flex-wrap gap-1">
                                        {session.events.map((evt) => (
                                          <Badge
                                            key={evt.id}
                                            variant="secondary"
                                          >
                                            {evt.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                  {session.consoleErrors.length > 0 ? (
                                    <div>
                                      <h4 className="mb-2 text-sm font-medium">
                                        {m.common_errors()}
                                      </h4>
                                      <div className="space-y-1">
                                        {session.consoleErrors.map((err) => (
                                          <div
                                            className="text-destructive text-sm"
                                            key={err.id}
                                          >
                                            [{err.level}] {err.message}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}
                                  <Button size="sm" variant="outline">
                                    {m.sessions_excludeDevice()}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={7}>
                        <Users className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Session recordings will appear here once visitors
                          start browsing
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
