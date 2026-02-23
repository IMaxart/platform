import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { Header } from '~/components/layout/header'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { getConsoleErrors } from '~/lib/server/queries'

export const Route = createFileRoute('/errors')({
  component: ErrorsPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

function ErrorsPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState('7')
  const [level, setLevel] = useState<string>('all')
  const daysNum = Number(days)

  const errorsQuery = useQuery({
    enabled: false,
    queryFn: () =>
      getConsoleErrors({
        data: {
          days: daysNum,
          level: level === 'all' ? undefined : level,
          projectId: DEMO_PROJECT_ID,
        },
      }),
    queryKey: ['console-errors', DEMO_PROJECT_ID, daysNum, level],
  })

  return (
    <>
      <Header title={t('errors.title')} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs onValueChange={setLevel} value={level}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="error">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('errors.error')}
              </TabsTrigger>
              <TabsTrigger value="warning">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {t('errors.warning')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('errors.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('errors.level')}</TableHead>
                    <TableHead>{t('errors.message')}</TableHead>
                    <TableHead className="text-right">
                      {t('errors.count')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('errors.lastSeen')}
                    </TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errorsQuery.data ? (
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
                          {error.latestStack ? (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  {t('errors.stackTrace')}
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    {t('errors.stackTrace')}
                                  </DialogTitle>
                                </DialogHeader>
                                <pre className="bg-muted max-h-96 overflow-auto rounded-md p-4 text-xs">
                                  {error.latestStack}
                                </pre>
                                {error.latestPath ? (
                                  <p className="text-muted-foreground text-sm">
                                    Page: {error.latestPath}
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
                      <TableCell className="text-center" colSpan={5}>
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
