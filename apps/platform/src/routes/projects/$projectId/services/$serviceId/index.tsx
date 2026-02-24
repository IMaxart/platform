import { Badge } from '@platform/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { BarChart3, Globe, TrendingUp, Users } from 'lucide-react'

import { Header } from '~/components/layout/header'
import {
  getBotStats,
  getTopCountries,
  getTopPages,
  getTopReferrers,
  getVisitorStats,
} from '~/lib/server/queries'

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/',
)({
  component: ServiceAnalyticsOverview,
})

function ServiceAnalyticsOverview() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/',
  })

  const stats = useQuery({
    queryFn: () => getVisitorStats({ data: { serviceId } }),
    queryKey: ['visitor-stats', serviceId],
  })

  const topPages = useQuery({
    queryFn: () => getTopPages({ data: { days: 30, limit: 5, serviceId } }),
    queryKey: ['top-pages', serviceId],
  })

  const topReferrers = useQuery({
    queryFn: () => getTopReferrers({ data: { days: 30, limit: 5, serviceId } }),
    queryKey: ['top-referrers', serviceId],
  })

  const topCountries = useQuery({
    queryFn: () => getTopCountries({ data: { days: 30, limit: 5, serviceId } }),
    queryKey: ['top-countries', serviceId],
  })

  const botStats = useQuery({
    queryFn: () => getBotStats({ data: { days: 30, serviceId } }),
    queryKey: ['bot-stats', serviceId],
  })

  return (
    <>
      <Header title="Analytics" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Today</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.today ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last 7 days</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.last7 ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last 30 days</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.last30 ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Page views (30d)</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.totalPageViews ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Top Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topPages.data?.map((page) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={page.path}
                  >
                    <span className="truncate font-mono text-xs">
                      {page.path}
                    </span>
                    <Badge variant="secondary">{page.views}</Badge>
                  </div>
                ))}
                {!topPages.data?.length && (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Top Referrers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topReferrers.data?.map((ref) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={ref.referrer}
                  >
                    <span className="truncate">{ref.referrer ?? 'Direct'}</span>
                    <Badge variant="secondary">{ref.count}</Badge>
                  </div>
                ))}
                {!topReferrers.data?.length && (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Top Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topCountries.data?.map((country) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={country.countryCode}
                  >
                    <span>{country.countryCode ?? 'Unknown'}</span>
                    <Badge variant="secondary">{country.count}</Badge>
                  </div>
                ))}
                {!topCountries.data?.length && (
                  <p className="text-muted-foreground text-sm">No data yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Traffic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Humans</span>
                  <Badge variant="default">{botStats.data?.humans ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Bots</span>
                  <Badge variant="outline">{botStats.data?.bots ?? 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
