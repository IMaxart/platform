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

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getTopPages } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/pages')({
  component: PagesPage,
})

const DEMO_SERVICE_ID = '00000000-0000-0000-0000-000000000000'

function PagesPage() {
  const [days, setDays] = useState('30')
  const daysNum = Number(days)

  type PageData = {
    avgDurationMs: null | string
    path: string
    uniqueVisitors: number
    views: number
  }

  const pages = useQuery<PageData[]>({
    enabled: false,
    queryFn: () =>
      getTopPages({
        data: { days: daysNum, limit: 100, serviceId: DEMO_SERVICE_ID },
      }) as Promise<PageData[]>,
    queryKey: ['pages', DEMO_SERVICE_ID, daysNum],
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
                  {pages.data ? (
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
                          {page.avgDurationMs
                            ? formatDuration(Number(page.avgDurationMs))
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-center" colSpan={4}>
                        {m.common_noData()}
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
