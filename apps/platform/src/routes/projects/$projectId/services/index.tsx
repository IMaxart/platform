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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@platform/ui/components/dialog'
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
  Pencil,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import type { SortKey } from '~/components/dashboard/sort-select'
import { applySortKey, SortSelect } from '~/components/dashboard/sort-select'
import { Header } from '~/components/layout/header'
import {
  createEndpoint,
  createService,
  deleteEndpoint,
  deleteService,
  getProjectServices,
  updateService,
} from '~/lib/server/service-queries'
import * as m from '~/paraglide/messages'

type ProjectService = {
  analyticsEnabled: boolean
  createdAt: Date | string
  domain: null | string
  enabled: boolean
  endpoints: StatusEndpoint[]
  id: string
  name: string
  primaryDomain: null | string
  publicStatusHost: null | string
  slug: string
  statusEnabled: boolean
}

type StatusEndpoint = {
  displayName: string
  enabled: boolean
  id: string
  internalPath: string
  intervalSec: number
  method: string
}

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

type EditServiceDialogProps = {
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
  service: ProjectService
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
      <p className="mb-3 text-sm font-medium">{m.services_addEndpoint()}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <form.Field name="displayName">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">{m.services_displayName()}</Label>
              <Input
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder={m.placeholder_endpointName()}
                required
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="method">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">{m.services_httpMethod()}</Label>
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
              <Label className="text-xs">{m.services_path()}</Label>
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
              <Label className="text-xs">{m.services_intervalSec()}</Label>
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
              <Label className="text-xs">{m.services_timeoutMs()}</Label>
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
              <Label className="text-xs">{m.services_warnThresholdMs()}</Label>
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
              {m.services_addEndpoint()}
            </Button>
          )}
        </form.Subscribe>
        <Button onClick={onCancel} size="sm" type="button" variant="ghost">
          {m.common_cancel()}
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
          ...(value.domain ? { domain: value.domain } : {}),
          name: value.name,
          ...(value.primaryDomain
            ? { primaryDomain: value.primaryDomain }
            : {}),
          projectId,
          ...(value.publicStatusHost
            ? { publicStatusHost: value.publicStatusHost }
            : {}),
          ...(salt !== undefined ? { salt } : {}),
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
        <CardTitle>{m.services_addNewService()}</CardTitle>
        <CardDescription>{m.services_addServiceDescription()}</CardDescription>
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
                  <Label>{m.services_serviceName()}</Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder={m.placeholder_serviceName()}
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
                    {m.services_slug()}{' '}
                    <span className="text-muted-foreground">
                      {m.services_slugAuto()}
                    </span>
                  </Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder={m.placeholder_serviceSlug()}
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
                <p className="text-sm font-medium">{m.services_analytics()}</p>
                <p className="text-muted-foreground text-xs">
                  {m.services_analyticsDescription()}
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
                        <Label>{m.services_domain()}</Label>
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
                <p className="text-sm font-medium">
                  {m.services_statusMonitoring()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.services_statusMonitoringDescription()}
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
                          <Label>{m.services_publicStatusHost()}</Label>
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
                          <Label>{m.services_primaryDomain()}</Label>
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
                  {m.services_createService()}
                </Button>
              )}
            </form.Subscribe>
            <Button onClick={onCancel} type="button" variant="ghost">
              {m.common_cancel()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EditServiceDialog({
  onOpenChange,
  open,
  projectId,
  service,
}: EditServiceDialogProps) {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      analyticsEnabled: service.analyticsEnabled,
      domain: service.domain ?? '',
      name: service.name,
      primaryDomain: service.primaryDomain ?? '',
      publicStatusHost: service.publicStatusHost ?? '',
      slug: service.slug,
      statusEnabled: service.statusEnabled,
    },
    onSubmit: async ({ value }) => {
      await updateService({
        data: {
          patch: {
            analyticsEnabled: value.analyticsEnabled,
            domain: value.domain || null,
            name: value.name,
            primaryDomain: value.primaryDomain || null,
            publicStatusHost: value.publicStatusHost || null,
            slug: value.slug,
            statusEnabled: value.statusEnabled,
          },
          serviceId: service.id,
        },
      })
      void queryClient.invalidateQueries({
        queryKey: ['services', projectId],
      })
      onOpenChange(false)
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{m.services_editService()}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label>{m.services_serviceName()}</Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder={m.placeholder_serviceName()}
                    required
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="slug">
              {(field) => (
                <div className="space-y-2">
                  <Label>{m.services_slug()}</Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder={m.placeholder_serviceSlug()}
                    required
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{m.services_analytics()}</p>
                <p className="text-muted-foreground text-xs">
                  {m.services_analyticsDescription()}
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
                        <Label>{m.services_domain()}</Label>
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
                <p className="text-sm font-medium">
                  {m.services_statusMonitoring()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.services_statusMonitoringDescription()}
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
                          <Label>{m.services_publicStatusHost()}</Label>
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
                          <Label>{m.services_primaryDomain()}</Label>
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

          <DialogFooter>
            <Button
              onClick={() => {
                onOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {m.common_cancel()}
            </Button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {m.common_save()}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ServicesPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/services/' })
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('newest')
  const [expandedServiceId, setExpandedServiceId] = useState<null | string>(
    null,
  )
  const [editingService, setEditingService] = useState<null | ProjectService>(
    null,
  )

  const servicesQuery = useQuery({
    queryFn: async () =>
      (await getProjectServices({ data: projectId })) as ProjectService[],
    queryKey: ['services', projectId],
  })

  const sortedServices = useMemo(
    () => applySortKey(servicesQuery.data ?? [], sortKey),
    [servicesQuery.data, sortKey],
  )

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
      <Header title={m.services_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{m.services_title()}</h2>
            <p className="text-muted-foreground text-sm">
              {m.services_description()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SortSelect onChange={setSortKey} value={sortKey} />
            <Button
              onClick={() => {
                setShowCreate(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {m.services_addService()}
            </Button>
          </div>
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
          {sortedServices.map((service) => (
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
                        {m.services_analytics()}
                      </Badge>
                    )}
                    {service.statusEnabled && (
                      <Badge variant="secondary">
                        <Activity className="mr-1 h-3 w-3" />
                        {m.services_status()}
                      </Badge>
                    )}
                    {!service.enabled && (
                      <Badge variant="outline">{m.common_disabled()}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {service.domain ?? service.slug}
                    {service.publicStatusHost !== null
                      ? ` · ${service.publicStatusHost}`
                      : ''}
                  </CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingService(service)
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      {m.services_editService()}
                    </DropdownMenuItem>
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
                        {m.services_addEndpoint()}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        void handleDeleteService(service.id)
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {m.services_deleteService()}
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
                            {endpoint.enabled ? m.common_on() : m.common_off()}
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
                    {m.services_noEndpointsYet()}
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
                  {m.services_noServicesYet()}
                </p>
                <Button
                  onClick={() => {
                    setShowCreate(true)
                  }}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {m.services_registerFirstService()}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {editingService !== null && (
        <EditServiceDialog
          onOpenChange={(open) => {
            if (!open) setEditingService(null)
          }}
          open
          projectId={projectId}
          service={editingService}
        />
      )}
    </>
  )
}
