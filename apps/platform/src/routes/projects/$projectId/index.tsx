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
import { Activity, BarChart3, Server } from 'lucide-react'

import { Header } from '~/components/layout/header'
import { getProjectServices } from '~/lib/server/service-queries'
import * as m from '~/paraglide/messages'

type ProjectService = {
  analyticsEnabled: boolean
  domain: null | string
  enabled: boolean
  endpoints: { id: string }[]
  id: string
  name: string
  slug: string
  statusEnabled: boolean
}

export const Route = createFileRoute('/projects/$projectId/')({
  component: ProjectOverview,
})

function ProjectOverview() {
  const { projectId } = useParams({ from: '/projects/$projectId/' })

  const servicesQuery = useQuery({
    queryFn: async () =>
      (await getProjectServices({ data: projectId })) as ProjectService[],
    queryKey: ['services', projectId],
  })

  return (
    <>
      <Header title={m.projectOverview_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold">
            {m.projectOverview_services()}
          </h2>
          <p className="text-muted-foreground text-sm">
            {m.projectOverview_servicesDescription()}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servicesQuery.data?.map((service) => (
            <Card
              className="transition-all duration-200 hover:shadow-md"
              key={service.id}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Server className="h-4 w-4" />
                  {service.name}
                </CardTitle>
                <CardDescription>
                  {service.domain ?? service.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {service.analyticsEnabled && (
                    <Badge variant="default">
                      <BarChart3 className="mr-1 h-3 w-3" />
                      {m.projectOverview_analytics()}
                    </Badge>
                  )}
                  {service.statusEnabled && (
                    <Badge variant="secondary">
                      <Activity className="mr-1 h-3 w-3" />
                      {m.projectOverview_status()}
                    </Badge>
                  )}
                  {!service.analyticsEnabled && !service.statusEnabled && (
                    <Badge variant="outline">
                      {m.projectOverview_noFeaturesEnabled()}
                    </Badge>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  {service.statusEnabled && service.endpoints.length > 0 && (
                    <span>
                      {service.endpoints.length} {m.projectOverview_endpoints()}
                    </span>
                  )}
                  {!service.enabled && (
                    <span className="text-destructive">
                      {m.common_disabled()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {servicesQuery.data?.length === 0 && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="text-muted-foreground mb-4 h-10 w-10" />
                <p className="text-muted-foreground mb-2 text-sm">
                  {m.projectOverview_noServicesYet()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.projectOverview_goToServices()}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
