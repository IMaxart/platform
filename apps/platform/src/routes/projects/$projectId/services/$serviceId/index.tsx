import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import {
  BarChart3,
  Check,
  Code,
  Copy,
  Globe,
  Rocket,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  getBotStats,
  getTopCountries,
  getTopPages,
  getTopReferrers,
  getVisitorStats,
} from '~/lib/server/analytics-queries'
import { getProjectServices } from '~/lib/server/service-queries'
import * as m from '~/paraglide/messages'

type BotStats = {
  bots: number
  humans: number
}

type TopCountryRow = {
  count: number
  countryCode: null | string
}

type TopPageRow = {
  avgDurationMs: null | string
  path: string
  uniqueVisitors: number
  views: number
}

type TopReferrerRow = {
  count: number
  referrer: null | string
}

type VisitorStats = {
  avgDurationMs: number
  last7: number
  last30: number
  lastYear: number
  today: number
  totalPageViews: number
  yesterday: number
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/',
)({
  component: ServiceAnalyticsOverview,
})

function OnboardingGuide({
  projectId,
  serviceId,
}: {
  projectId: string
  serviceId: string
}) {
  const [copied, setCopied] = useState(false)

  const { data: services } = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  const service = services?.find((s) => s.id === serviceId)
  const domain = service?.domain ?? 'yourdomain.com'
  const snippet = `<script defer src="https://${domain}/t.js"></script>`

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <div className="flex-1 p-4 md:p-6">
      <div className="mx-auto max-w-2xl space-y-8 py-12">
        <div className="text-center">
          <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Rocket className="text-primary h-8 w-8" />
          </div>
          <h2 className="text-2xl font-semibold">
            {m.serviceAnalytics_setUp()} {service?.name ?? 'your service'}
          </h2>
          <p className="text-muted-foreground mt-2">
            {m.serviceAnalytics_setupDescription()}
          </p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  1
                </div>
                <CardTitle className="text-base">
                  {m.serviceAnalytics_addTrackingSnippet()}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3 text-sm">
                {m.serviceAnalytics_addScriptTag()} {'<head>'}:
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-muted flex-1 rounded-md p-3 font-mono text-xs">
                  {snippet}
                </code>
                <Button
                  onClick={() => {
                    void copySnippet()
                  }}
                  size="icon"
                  variant="outline"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  2
                </div>
                <CardTitle className="text-base">
                  {m.serviceAnalytics_configureFeatures()}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-3 text-sm">
                {m.serviceAnalytics_configureDescription()}
              </p>
              <Link
                params={{ projectId, serviceId }}
                to="/projects/$projectId/services/$serviceId/settings"
              >
                <Button size="sm" variant="outline">
                  <Code className="mr-2 h-4 w-4" />
                  {m.serviceAnalytics_goToSettings()}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="border-muted-foreground/30 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold">
                  3
                </div>
                <CardTitle className="text-base">
                  {m.serviceAnalytics_visitSite()}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {m.serviceAnalytics_visitDescription()}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ServiceAnalyticsOverview() {
  const { projectId, serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/',
  })

  const stats = useQuery({
    queryFn: async () =>
      (await getVisitorStats({ data: { serviceId } })) as VisitorStats,
    queryKey: ['visitor-stats', serviceId],
  })

  const topPages = useQuery({
    queryFn: async () =>
      (await getTopPages({
        data: { days: 30, limit: 5, serviceId },
      })) as TopPageRow[],
    queryKey: ['top-pages', serviceId],
  })

  const topReferrers = useQuery({
    queryFn: async () =>
      (await getTopReferrers({
        data: { days: 30, limit: 5, serviceId },
      })) as TopReferrerRow[],
    queryKey: ['top-referrers', serviceId],
  })

  const topCountries = useQuery({
    queryFn: async () =>
      (await getTopCountries({
        data: { days: 30, limit: 5, serviceId },
      })) as TopCountryRow[],
    queryKey: ['top-countries', serviceId],
  })

  const botStats = useQuery({
    queryFn: async () =>
      (await getBotStats({ data: { days: 30, serviceId } })) as BotStats,
    queryKey: ['bot-stats', serviceId],
  })

  const hasAnyData =
    (stats.data?.today ?? 0) > 0 ||
    (stats.data?.last7 ?? 0) > 0 ||
    (stats.data?.last30 ?? 0) > 0

  if (!stats.isLoading && !hasAnyData) {
    return (
      <>
        <Header title={m.serviceAnalytics_title()} />
        <OnboardingGuide projectId={projectId} serviceId={serviceId} />
      </>
    )
  }

  return (
    <>
      <Header title={m.serviceAnalytics_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{m.time_today()}</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.today ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{m.time_last7days()}</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.last7 ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>{m.time_last30days()}</CardDescription>
              <CardTitle className="text-2xl">
                {stats.data?.last30 ?? '—'}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>
                {m.serviceAnalytics_pageViews30d()}
              </CardDescription>
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
                {m.serviceAnalytics_topPages()}
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
                {(topPages.data?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {m.common_noDataYet()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                {m.serviceAnalytics_topReferrers()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topReferrers.data?.map((ref) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={ref.referrer}
                  >
                    <span className="truncate">
                      {ref.referrer ?? m.serviceAnalytics_direct()}
                    </span>
                    <Badge variant="secondary">{ref.count}</Badge>
                  </div>
                ))}
                {(topReferrers.data?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {m.common_noDataYet()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                {m.serviceAnalytics_topCountries()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topCountries.data?.map((country) => (
                  <div
                    className="flex items-center justify-between text-sm"
                    key={country.countryCode}
                  >
                    <span>{country.countryCode ?? m.common_unknown()}</span>
                    <Badge variant="secondary">{country.count}</Badge>
                  </div>
                ))}
                {(topCountries.data?.length ?? 0) === 0 && (
                  <p className="text-muted-foreground text-sm">
                    {m.common_noDataYet()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                {m.serviceAnalytics_traffic()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{m.serviceAnalytics_humans()}</span>
                  <Badge variant="default">{botStats.data?.humans ?? 0}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{m.serviceAnalytics_bots()}</span>
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
