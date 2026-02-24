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
import { createFileRoute, useParams } from '@tanstack/react-router'
import { Loader2, MousePointerClick } from 'lucide-react'
import { useState } from 'react'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getEvents } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

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
  const daysNum = Number(days)

  const eventsQuery = useQuery({
    queryFn: () =>
      getEvents({
        data: { days: daysNum, serviceId },
      }),
    queryKey: ['events', serviceId, daysNum],
  })

  return (
    <>
      <Header title={m.events_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.events_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                      <TableCell className="py-12 text-center" colSpan={3}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : eventsQuery.data && eventsQuery.data.length > 0 ? (
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
                      <TableCell className="py-12 text-center" colSpan={3}>
                        <MousePointerClick className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Custom events will appear here once tracked via the
                          SDK
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
