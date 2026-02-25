import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@platform/ui/components/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui/components/table'
import { Tabs, TabsList, TabsTrigger } from '@platform/ui/components/tabs'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { AlertCircle, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { getConsoleErrors } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

type ConsoleErrorRow = {
  count: number
  lastSeen: string
  latestPath: null | string
  latestStack: null | string
  level: string
  message: string
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/errors',
)({
  component: ErrorsPage,
})

function ErrorsPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/errors',
  })
  const [days, setDays] = useState('7')
  const [level, setLevel] = useState<string>('all')
  const daysNum = Number(days)

  const errorsQuery = useQuery<ConsoleErrorRow[]>({
    queryFn: () =>
      getConsoleErrors({
        data: {
          days: daysNum,
          ...(level !== 'all' && { level }),
          serviceId,
        },
      }) as Promise<ConsoleErrorRow[]>,
    queryKey: ['console-errors', serviceId, daysNum, level],
  })

  return (
    <>
      <Header title={m.errors_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs onValueChange={setLevel} value={level}>
            <TabsList>
              <TabsTrigger value="all">{m.common_all()}</TabsTrigger>
              <TabsTrigger value="error">
                <AlertCircle className="mr-1 h-3 w-3" />
                {m.errors_error()}
              </TabsTrigger>
              <TabsTrigger value="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {m.errors_warning()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{m.errors_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.errors_level()}</TableHead>
                    <TableHead>{m.errors_message()}</TableHead>
                    <TableHead className="text-right">
                      {m.errors_count()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.errors_lastSeen()}
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorsQuery.isLoading ? (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={5}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : errorsQuery.data && errorsQuery.data.length > 0 ? (
                    errorsQuery.data.map((error, idx) => (
                      <TableRow key={`${error.message}-${idx}`}>
                        <TableCell>
                          <Badge
                            variant={
                              error.level === 'error'
                                ? 'destructive'
                                : 'outline'
                            }
                          >
                            {error.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate font-mono text-xs">
                          {error.message}
                        </TableCell>
                        <TableCell className="text-right">
                          {error.count}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-right text-sm">
                          {new Date(error.lastSeen).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {error.latestStack !== null ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  {m.errors_stackTrace()}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    {m.errors_stackTrace()}
                                  </DialogTitle>
                                </DialogHeader>
                                <pre className="bg-muted max-h-96 overflow-auto rounded-md p-4 text-xs">
                                  {error.latestStack}
                                </pre>
                                {error.latestPath !== null ? (
                                  <p className="text-muted-foreground text-sm">
                                    {m.errors_page()} {error.latestPath}
                                  </p>
                                ) : null}
                              </DialogContent>
                            </Dialog>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={5}>
                        <ShieldCheck className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {m.errors_noErrorsClean()}
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
