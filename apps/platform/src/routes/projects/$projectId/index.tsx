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
import { getProjectServices } from '~/lib/server/queries'

export const Route = createFileRoute('/projects/$projectId/')({
  component: ProjectOverview,
})

function ProjectOverview() {
  const { projectId } = useParams({ from: '/projects/$projectId/' })

  const servicesQuery = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  return (
    <>
      <Header title="Project Overview" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-semibold">Services</h2>
          <p className="text-muted-foreground text-sm">
            Each service can independently have analytics, status monitoring, or
            both
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
                      Analytics
                    </Badge>
                  )}
                  {service.statusEnabled && (
                    <Badge variant="secondary">
                      <Activity className="mr-1 h-3 w-3" />
                      Status
                    </Badge>
                  )}
                  {!service.analyticsEnabled && !service.statusEnabled && (
                    <Badge variant="outline">No features enabled</Badge>
                  )}
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-xs">
                  {service.statusEnabled && service.endpoints.length > 0 && (
                    <span>{service.endpoints.length} endpoint(s)</span>
                  )}
                  {!service.enabled && (
                    <span className="text-destructive">Disabled</span>
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
                  No services registered yet
                </p>
                <p className="text-muted-foreground text-xs">
                  Go to Services to add your first service
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
