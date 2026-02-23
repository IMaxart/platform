import { Badge } from '@platform/ui/components/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Skeleton } from '@platform/ui/components/skeleton'
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
import { Activity, Eye, MousePointerClick, Timer, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '~/components/dashboard/empty-state'
import { StatCard } from '~/components/dashboard/stat-card'
import { TimeRangeSelect } from '~/components/dashboard/time-range-select'
import { VisitorsChart } from '~/components/dashboard/visitors-chart'
import { Header } from '~/components/layout/header'
import {
  getBotStats,
  getTopCountries,
  getTopPages,
  getTopReferrers,
  getVisitorChart,
  getVisitorStats,
} from '~/lib/server/queries'

export const Route = createFileRoute('/')({
  component: OverviewPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

function OverviewPage() {
  const { t } = useTranslation()
  const [days, setDays] = useState('30')
  const daysNum = Number(days)

  const projectId = DEMO_PROJECT_ID

  const stats = useQuery({
    enabled: false,
    queryFn: () => getVisitorStats({ data: { projectId } }),
    queryKey: ['visitor-stats', projectId],
  })

  const chart = useQuery({
    enabled: false,
    queryFn: () => getVisitorChart({ data: { days: daysNum, projectId } }),
    queryKey: ['visitor-chart', projectId, daysNum],
  })

  const topPages = useQuery({
    enabled: false,
    queryFn: () => getTopPages({ data: { days: daysNum, projectId } }),
    queryKey: ['top-pages', projectId, daysNum],
  })

  const topReferrers = useQuery({
    enabled: false,
    queryFn: () => getTopReferrers({ data: { days: daysNum, projectId } }),
    queryKey: ['top-referrers', projectId, daysNum],
  })

  const topCountries = useQuery({
    enabled: false,
    queryFn: () => getTopCountries({ data: { days: daysNum, projectId } }),
    queryKey: ['top-countries', projectId, daysNum],
  })

  const botStats = useQuery({
    enabled: false,
    queryFn: () => getBotStats({ data: { days: daysNum, projectId } }),
    queryKey: ['bot-stats', projectId, daysNum],
  })

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <>
      <Header title={t('overview.title')} />
      <div className="flex-1 space-y-8 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div />
          <TimeRangeSelect onChange={setDays} value={days} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            title={t('overview.visitorsToday')}
            value={stats.data?.today ?? '\u2014'}
          />
          <StatCard
            icon={<Users className="h-4 w-4" />}
            title={t('overview.visitorsYesterday')}
            value={stats.data?.yesterday ?? '\u2014'}
          />
          <StatCard
            icon={<Eye className="h-4 w-4" />}
            title={t('overview.visitors7d')}
            value={stats.data?.last7 ?? '\u2014'}
          />
          <StatCard
            icon={<MousePointerClick className="h-4 w-4" />}
            title={t('overview.visitors30d')}
            value={stats.data?.last30 ?? '\u2014'}
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            title={t('overview.visitorsYear')}
            value={stats.data?.lastYear ?? '\u2014'}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <StatCard
            description={t('overview.visitors30d')}
            icon={<Eye className="h-4 w-4" />}
            title={t('overview.pageViews')}
            value={stats.data?.totalPageViews ?? '\u2014'}
          />
          <StatCard
            icon={<Timer className="h-4 w-4" />}
            title={t('overview.avgDuration')}
            value={
              stats.data?.avgDurationMs
                ? formatDuration(stats.data.avgDurationMs)
                : '\u2014'
            }
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            title={`${t('overview.bots')} / ${t('overview.humans')}`}
            value={
              botStats.data
                ? `${botStats.data.bots} / ${botStats.data.humans}`
                : '\u2014'
            }
          />
        </div>

        {chart.data ? (
          <VisitorsChart data={chart.data} />
        ) : (
          <Card>
            <CardContent className="p-8">
              <Skeleton className="h-[320px] w-full rounded-lg" />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <Card className="transition-all duration-300 ease-out hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t('overview.topPages')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topPages.data && topPages.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pages.path')}</TableHead>
                      <TableHead className="text-right">
                        {t('pages.views')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topPages.data.map((page) => (
                      <TableRow
                        className="transition-colors duration-150"
                        key={page.path}
                      >
                        <TableCell className="font-mono text-xs">
                          {page.path}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {page.views}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t('common.noData')} />
              )}
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 ease-out hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t('overview.topReferrers')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topReferrers.data && topReferrers.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">
                        {t('overview.visitors')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topReferrers.data.map((ref) => (
                      <TableRow
                        className="transition-colors duration-150"
                        key={ref.referrer ?? 'direct'}
                      >
                        <TableCell className="text-xs">
                          {ref.referrer ?? 'Direct'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {ref.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t('common.noData')} />
              )}
            </CardContent>
          </Card>

          <Card className="transition-all duration-300 ease-out hover:shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {t('overview.topCountries')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCountries.data && topCountries.data.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country</TableHead>
                      <TableHead className="text-right">
                        {t('overview.visitors')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCountries.data.map((country) => (
                      <TableRow
                        className="transition-colors duration-150"
                        key={country.countryCode ?? 'unknown'}
                      >
                        <TableCell>
                          <Badge variant="outline">
                            {country.countryCode ?? '??'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {country.count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState title={t('common.noData')} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
