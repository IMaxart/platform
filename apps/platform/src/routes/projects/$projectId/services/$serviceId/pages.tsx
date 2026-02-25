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
import { FileText, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getTopPages } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/pages',
)({
  component: PagesPage,
})

function PagesPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/pages',
  })
  const [days, setDays] = useState('30')
  const daysNum = Number(days)

  type PageData = {
    avgDurationMs: null | string
    path: string
    uniqueVisitors: number
    views: number
  }

  const pages = useQuery<PageData[]>({
    queryFn: () =>
      getTopPages({
        data: { days: daysNum, limit: 100, serviceId },
      }) as Promise<PageData[]>,
    queryKey: ['pages', serviceId, daysNum],
  })

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <>
      <Header title={m.pages_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.pages_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.pages_path()}</TableHead>
                    <TableHead className="text-right">
                      {m.pages_views()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.pages_uniqueVisitors()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.pages_avgTime()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.isLoading ? (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={4}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : pages.data && pages.data.length > 0 ? (
                    pages.data.map((page) => (
                      <TableRow key={page.path}>
                        <TableCell className="font-mono text-sm">
                          {page.path}
                        </TableCell>
                        <TableCell className="text-right">
                          {page.views}
                        </TableCell>
                        <TableCell className="text-right">
                          {page.uniqueVisitors}
                        </TableCell>
                        <TableCell className="text-right">
                          {page.avgDurationMs !== null
                            ? formatDuration(Number(page.avgDurationMs))
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={4}>
                        <FileText className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {m.pages_noDataDescription()}
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
