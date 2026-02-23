import { Badge } from '@platform/ui/components/badge'
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
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getEvents } from '~/lib/server/queries'

export const Route = createFileRoute('/events')({
  component: EventsPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

function EventsPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState('30')
  const daysNum = Number(days)

  const eventsQuery = useQuery({
    enabled: false,
    queryFn: () =>
      getEvents({
        data: { days: daysNum, projectId: DEMO_PROJECT_ID },
      }),
    queryKey: ['events', DEMO_PROJECT_ID, daysNum],
  })

  return (
    <>
      <Header title={t('events.title')} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('events.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('events.name')}</TableHead>
                    <TableHead className="text-right">
                      {t('events.count')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('events.lastSeen')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eventsQuery.data ? (
                    eventsQuery.data.map((event) => (
                      <TableRow key={event.name}>
                        <TableCell>
                          <Badge className="font-mono" variant="secondary">
                            {event.name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {event.count}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {new Date(event.lastSeen).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-center" colSpan={3}>
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
