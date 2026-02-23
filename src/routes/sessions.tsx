import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronDown,
  ChevronRight,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { getSessions } from '~/lib/server/queries'

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

export const Route = createFileRoute('/sessions')({
  component: SessionsPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

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
  const { t } = useTranslation()
  const [days, setDays] = useState('7')
  const [expandedSession, setExpandedSession] = useState<null | string>(null)
  const daysNum = Number(days)

  const sessionsQuery = useQuery<SessionData[]>({
    enabled: false,
    queryFn: () =>
      getSessions({
        data: { days: daysNum, limit: 50, projectId: DEMO_PROJECT_ID },
      }) as Promise<SessionData[]>,
    queryKey: ['sessions', DEMO_PROJECT_ID, daysNum],
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
      <Header title={t('sessions.title')} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('sessions.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>{t('sessions.visitor')}</TableHead>
                    <TableHead>{t('sessions.device')}</TableHead>
                    <TableHead>{t('sessions.location')}</TableHead>
                    <TableHead className="text-right">
                      {t('sessions.pagesViewed')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('sessions.duration')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('sessions.startedAt')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsQuery.data ? (
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
                                      {t('sessions.timeline')}
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
                                        {t('common.events')}
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
                                        {t('common.errors')}
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
                                    {t('sessions.excludeDevice')}
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
                      <TableCell className="text-center" colSpan={7}>
                        {t('common.noData')}
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
