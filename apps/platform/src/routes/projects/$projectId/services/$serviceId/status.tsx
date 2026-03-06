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
import { Activity, ExternalLink, Server } from 'lucide-react'

import { Header } from '~/components/layout/header'
import { getServiceStatusDetail } from '~/lib/server/status-queries'
import * as m from '~/paraglide/messages'

type EndpointStatus = 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'UP'

const getStatusBadgeVariant = ({
  status,
}: {
  status: EndpointStatus
}): 'danger' | 'secondary' | 'success' | 'warning' => {
  if (status === 'UP') return 'success'
  if (status === 'DEGRADED') return 'warning'
  if (status === 'DOWN') return 'danger'
  return 'secondary'
}

const translateStatus = (status: EndpointStatus) => {
  if (status === 'UP') return m.status_up()
  if (status === 'DEGRADED') return m.status_degraded()
  if (status === 'DOWN') return m.status_down()
  return m.common_unknown()
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/status',
)({
  component: ServiceStatusPage,
})

function ServiceStatusPage() {
  const { projectId, serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/status',
  })

  const statusQuery = useQuery({
    queryFn: () => getServiceStatusDetail({ data: serviceId }),
    queryKey: ['service-status', serviceId],
    refetchInterval: 10_000,
  })

  const service = statusQuery.data

  if (statusQuery.isLoading) {
    return (
      <>
        <Header title={m.serviceStatus_title()} />
        <div className="flex-1 p-4 md:p-6">
          <p className="text-muted-foreground text-sm">{m.common_loading()}</p>
        </div>
      </>
    )
  }

  if (service?.statusEnabled !== true) {
    return (
      <>
        <Header title={m.serviceStatus_title()} />
        <div className="flex-1 p-4 md:p-6">
          <div className="mx-auto max-w-md py-16 text-center">
            <div className="bg-muted mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Activity className="text-muted-foreground h-6 w-6" />
            </div>
            <p className="font-medium">{m.serviceStatus_notEnabled()}</p>
            <p className="text-muted-foreground mt-1 text-sm">
              {m.serviceStatus_enableInServices()}
            </p>
            <Link params={{ projectId }} to="/projects/$projectId/services">
              <Button className="mt-4" size="sm" variant="outline">
                {m.serviceStatus_goToServices()}
              </Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  const publicHost = service.publicStatusHost

  return (
    <>
      <Header title={m.serviceStatus_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{m.serviceStatus_publicPage()}</CardTitle>
                <CardDescription>
                  {publicHost ?? m.serviceStatus_notConfigured()}
                </CardDescription>
              </div>
              {publicHost !== null ? (
                <a
                  href={`https://${publicHost}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Button size="sm" variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {m.serviceStatus_openPublicPage()}
                  </Button>
                </a>
              ) : null}
            </div>
            {publicHost === null ? (
              <p className="text-muted-foreground text-xs">
                {m.serviceStatus_publicStatusHostHint()}
              </p>
            ) : null}
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              {m.status_endpoints()}
            </CardTitle>
            <CardDescription>{m.serviceStatus_description()}</CardDescription>
          </CardHeader>
          <CardContent>
            {service.endpoints.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                  <Server className="text-muted-foreground h-5 w-5" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {m.status_noEndpoints()}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {service.endpoints.map((endpoint) => {
                  const latencyMs = endpoint.latestCheck?.latencyMs
                  const latency =
                    latencyMs === null || latencyMs === undefined
                      ? '—'
                      : `${String(latencyMs)}ms`
                  return (
                    <div
                      className="hover:bg-accent/50 flex items-center justify-between rounded-lg border px-4 py-3 transition-colors duration-150"
                      key={endpoint.id}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {endpoint.displayName}
                          </span>
                          <span className="text-muted-foreground font-mono text-xs">
                            {endpoint.key}
                          </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 text-xs">
                          {m.status_latency()}: {latency} ·{' '}
                          {endpoint.internalMode} · {endpoint.method}{' '}
                          {endpoint.internalPath}
                        </div>
                      </div>
                      <Badge
                        variant={getStatusBadgeVariant({
                          status: endpoint.status as EndpointStatus,
                        })}
                      >
                        {translateStatus(endpoint.status as EndpointStatus)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
