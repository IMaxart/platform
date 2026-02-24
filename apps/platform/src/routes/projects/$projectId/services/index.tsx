import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@platform/ui/components/dropdown-menu'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { Separator } from '@platform/ui/components/separator'
import { Switch } from '@platform/ui/components/switch'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import {
  Activity,
  BarChart3,
  Globe,
  Loader2,
  MoreVertical,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  createEndpoint,
  createService,
  deleteEndpoint,
  deleteService,
  getProjectServices,
} from '~/lib/server/queries'

export const Route = createFileRoute('/projects/$projectId/services/')({
  component: ServicesPage,
})

type CreateEndpointFormProps = {
  onCancel: () => void
  onSuccess: () => void
  serviceId: string
}

type CreateServiceFormProps = {
  onCancel: () => void
  onSuccess: () => void
  projectId: string
}

function CreateEndpointForm({
  onCancel,
  onSuccess,
  serviceId,
}: CreateEndpointFormProps) {
  const form = useForm({
    defaultValues: {
      degradedMs: 3000,
      displayName: '',
      expectedStatusMax: 299,
      expectedStatusMin: 200,
      internalMode: 'http',
      internalPath: '/',
      intervalSec: 60,
      key: '',
      method: 'GET',
      timeoutMs: 10000,
      warnMs: 1000,
    },
    onSubmit: async ({ value }) => {
      const key =
        value.key ||
        value.displayName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

      await createEndpoint({
        data: {
          degradedMs: value.degradedMs,
          displayName: value.displayName,
          expectedStatusMax: value.expectedStatusMax,
          expectedStatusMin: value.expectedStatusMin,
          internalMode: value.internalMode,
          internalPath: value.internalPath,
          intervalSec: value.intervalSec,
          key,
          method: value.method,
          serviceId,
          timeoutMs: value.timeoutMs,
          warnMs: value.warnMs,
        },
      })
      onSuccess()
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <p className="mb-3 text-sm font-medium">Add endpoint</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="displayName">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Display name</Label>
              <Input
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder="Health Check"
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="method">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">HTTP method</Label>
              <Input
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder="GET"
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="internalPath">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Path</Label>
              <Input
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder="/health"
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="intervalSec">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Interval (sec)</Label>
              <Input
                min={10}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(Number(e.target.value))
                }}
                required
                type="number"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="timeoutMs">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Timeout (ms)</Label>
              <Input
                min={100}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(Number(e.target.value))
                }}
                required
                type="number"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="warnMs">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">Warn threshold (ms)</Label>
              <Input
                min={100}
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(Number(e.target.value))
                }}
                required
                type="number"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>

      <div className="mt-4 flex gap-2">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button disabled={isSubmitting} size="sm" type="submit">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add endpoint
            </Button>
          )}
        </form.Subscribe>
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          Cancel
        </Button>
      </div>
    </form>
  )
}

function CreateServiceForm({
  onCancel,
  onSuccess,
  projectId,
}: CreateServiceFormProps) {
  const form = useForm({
    defaultValues: {
      analyticsEnabled: true,
      domain: '',
      name: '',
      primaryDomain: '',
      publicStatusHost: '',
      slug: '',
      statusEnabled: false,
    },
    onSubmit: async ({ value }) => {
      const slug =
        value.slug ||
        value.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

      const salt = value.analyticsEnabled ? crypto.randomUUID() : undefined

      await createService({
        data: {
          analyticsEnabled: value.analyticsEnabled,
          domain: value.domain || undefined,
          name: value.name,
          primaryDomain: value.primaryDomain || undefined,
          projectId,
          publicStatusHost: value.publicStatusHost || undefined,
          salt,
          slug,
          statusEnabled: value.statusEnabled,
        },
      })
      onSuccess()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a new service</CardTitle>
        <CardDescription>
          A service represents a deployable unit (frontend, API, mobile app,
          etc.)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label>Service name</Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder="Frontend"
                    required
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <div className="space-y-2">
                  <Label>
                    Slug <span className="text-muted-foreground">(auto)</span>
                  </Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder="frontend"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <Separator className="my-5" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Analytics</p>
                <p className="text-muted-foreground text-xs">
                  Track visitors, page views, events, and errors
                </p>
              </div>
              <form.Field name="analyticsEnabled">
                {(field) => (
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => {
                      field.handleChange(v)
                    }}
                  />
                )}
              </form.Field>
            </div>

            <form.Subscribe selector={(s) => s.values.analyticsEnabled}>
              {(analyticsEnabled) =>
                analyticsEnabled ? (
                  <form.Field name="domain">
                    {(field) => (
                      <div className="space-y-2">
                        <Label>Domain (for analytics tracking)</Label>
                        <Input
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value)
                          }}
                          placeholder="example.com"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                ) : null
              }
            </form.Subscribe>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Status monitoring</p>
                <p className="text-muted-foreground text-xs">
                  Uptime checks with public status page
                </p>
              </div>
              <form.Field name="statusEnabled">
                {(field) => (
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => {
                      field.handleChange(v)
                    }}
                  />
                )}
              </form.Field>
            </div>

            <form.Subscribe selector={(s) => s.values.statusEnabled}>
              {(statusEnabled) =>
                statusEnabled ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <form.Field name="publicStatusHost">
                      {(field) => (
                        <div className="space-y-2">
                          <Label>Public status hostname</Label>
                          <Input
                            onBlur={field.handleBlur}
                            onChange={(e) => {
                              field.handleChange(e.target.value)
                            }}
                            placeholder="status.example.com"
                            value={field.state.value}
                          />
                        </div>
                      )}
                    </form.Field>
                    <form.Field name="primaryDomain">
                      {(field) => (
                        <div className="space-y-2">
                          <Label>Primary domain</Label>
                          <Input
                            onBlur={field.handleBlur}
                            onChange={(e) => {
                              field.handleChange(e.target.value)
                            }}
                            placeholder="api.example.com"
                            value={field.state.value}
                          />
                        </div>
                      )}
                    </form.Field>
                  </div>
                ) : null
              }
            </form.Subscribe>
          </div>

          <div className="mt-5 flex gap-2">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create service
                </Button>
              )}
            </form.Subscribe>
            <Button onClick={onCancel} type="button" variant="ghost">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ServicesPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/services/' })
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedServiceId, setExpandedServiceId] = useState<null | string>(
    null,
  )

  const servicesQuery = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
  })

  const handleDeleteService = async (serviceId: string) => {
    await deleteService({ data: { serviceId } })
    void queryClient.invalidateQueries({ queryKey: ['services', projectId] })
  }

  const handleDeleteEndpoint = async (endpointId: string) => {
    await deleteEndpoint({ data: { endpointId } })
    void queryClient.invalidateQueries({ queryKey: ['services', projectId] })
  }

  return (
    <>
      <Header title="Services" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Services</h2>
            <p className="text-muted-foreground text-sm">
              Register services with analytics, status monitoring, or both
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreate(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add service
          </Button>
        </div>

        {showCreate && (
          <CreateServiceForm
            onCancel={() => {
              setShowCreate(false)
            }}
            onSuccess={() => {
              setShowCreate(false)
              void servicesQuery.refetch()
            }}
            projectId={projectId}
          />
        )}

        <div className="space-y-4">
          {servicesQuery.data?.map((service) => (
            <Card key={service.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Server className="h-4 w-4" />
                    <Link
                      className="hover:underline"
                      params={{ projectId, serviceId: service.id }}
                      to="/projects/$projectId/services/$serviceId"
                    >
                      {service.name}
                    </Link>
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
                    {!service.enabled && (
                      <Badge variant="outline">Disabled</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {service.domain ?? service.slug}
                    {service.publicStatusHost &&
                      ` · ${service.publicStatusHost}`}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {service.statusEnabled && (
                      <DropdownMenuItem
                        onClick={() => {
                          setExpandedServiceId(
                            expandedServiceId === service.id
                              ? null
                              : service.id,
                          )
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add endpoint
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        void handleDeleteService(service.id)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete service
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                {service.statusEnabled && service.endpoints.length > 0 ? (
                  <div className="space-y-2">
                    {service.endpoints.map((endpoint) => (
                      <div
                        className="flex items-center justify-between rounded-md border p-3"
                        key={endpoint.id}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {endpoint.displayName}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {endpoint.method} {endpoint.internalPath} ·{' '}
                            {endpoint.intervalSec}s
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {endpoint.enabled ? 'On' : 'Off'}
                          </Badge>
                          <Button
                            onClick={() => {
                              void handleDeleteEndpoint(endpoint.id)
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="text-destructive h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : service.statusEnabled ? (
                  <p className="text-muted-foreground text-sm">
                    No endpoints configured yet
                  </p>
                ) : null}

                {expandedServiceId === service.id && (
                  <>
                    <Separator className="my-4" />
                    <CreateEndpointForm
                      onCancel={() => {
                        setExpandedServiceId(null)
                      }}
                      onSuccess={() => {
                        setExpandedServiceId(null)
                        void servicesQuery.refetch()
                      }}
                      serviceId={service.id}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          ))}

          {servicesQuery.data?.length === 0 && !showCreate && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="text-muted-foreground mb-4 h-10 w-10" />
                <p className="text-muted-foreground mb-4 text-sm">
                  No services registered yet
                </p>
                <Button
                  onClick={() => {
                    setShowCreate(true)
                  }}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Register your first service
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
