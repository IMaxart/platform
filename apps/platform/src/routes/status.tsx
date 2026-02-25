import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui/components/select'
import { Separator } from '@platform/ui/components/separator'
import { Skeleton } from '@platform/ui/components/skeleton'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Loader2, Plus, Server } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  createStatusEndpoint,
  createStatusService,
  getStatusServices,
  upsertStatusDokploy,
} from '~/lib/server/status-queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/status')({
  component: StatusPage,
})

type DokployRefType = 'application' | 'compose'

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

const DokploySection = ({
  initial,
  serviceId,
}: {
  initial: null | {
    lastDeployedAt: Date | null
    lastSyncAt: Date
    refId: string
    serviceId: string
    type: string
  }
  serviceId: string
}) => {
  const queryClient = useQueryClient()

  const form = useForm({
    defaultValues: {
      refId: initial?.refId ?? '',
      type: (initial?.type as DokployRefType | undefined) ?? 'application',
    },
    onSubmit: async ({ value }) => {
      await upsertStatusDokploy({
        data: {
          refId: value.refId.trim(),
          serviceId,
          type: value.type,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['status-services'] })
    },
  })

  const lastDeployed = initial?.lastDeployedAt
    ? new Date(initial.lastDeployedAt).toLocaleString()
    : '—'
  const lastSync = initial?.lastSyncAt
    ? new Date(initial.lastSyncAt).toLocaleString()
    : '—'

  return (
    <div className="space-y-4">
      <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {m.status_dokploy()}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <form.Field name="type">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">{m.status_dokployType()}</Label>
              <Select
                onValueChange={(value: string) => {
                  field.handleChange(value as DokployRefType)
                }}
                value={field.state.value}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">application</SelectItem>
                  <SelectItem value="compose">compose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
        <form.Field name="refId">
          {(field) => (
            <div className="space-y-1.5">
              <Label className="text-xs">{m.status_dokployRefId()}</Label>
              <Input
                onBlur={field.handleBlur}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder="applicationId / composeId"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {m.status_lastDeployed()}: {lastDeployed} · {m.status_lastSync()}:{' '}
          {lastSync}
        </span>
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Button
              disabled={isSubmitting}
              onClick={() => {
                void form.handleSubmit()
              }}
              size="sm"
              variant="outline"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {m.status_saveDokploy()}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </div>
  )
}

const AddEndpointSection = ({ serviceId }: { serviceId: string }) => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      degradedMs: '2000',
      displayName: '',
      internalHost: '',
      internalMode: 'traefikHost' as 'directUrl' | 'traefikHost',
      internalPath: '/',
      internalUrl: '',
      intervalSec: '60',
      key: '',
      publicUrl: '',
      timeoutMs: '5000',
    },
    onSubmit: async ({ value }) => {
      const intervalSec = Number.parseInt(value.intervalSec, 10)
      const timeoutMs = Number.parseInt(value.timeoutMs, 10)
      const degradedMs = Number.parseInt(value.degradedMs, 10)

      await createStatusEndpoint({
        data: {
          degradedMs: Number.isFinite(degradedMs) ? degradedMs : 2000,
          displayName: value.displayName.trim(),
          internalHost:
            value.internalHost.trim().length > 0
              ? value.internalHost.trim()
              : null,
          internalMode: value.internalMode,
          internalPath: value.internalPath.trim(),
          internalUrl:
            value.internalUrl.trim().length > 0
              ? value.internalUrl.trim()
              : null,
          intervalSec: Number.isFinite(intervalSec) ? intervalSec : 60,
          key: value.key.trim(),
          publicUrl:
            value.publicUrl.trim().length > 0 ? value.publicUrl.trim() : null,
          serviceId,
          timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
        },
      })

      form.reset()
      setIsOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['status-services'] })
    },
  })

  if (!isOpen) {
    return (
      <Button
        className="w-full"
        onClick={() => {
          setIsOpen(true)
        }}
        size="sm"
        variant="outline"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {m.status_addEndpoint()}
      </Button>
    )
  }

  return (
    <div className="bg-muted/30 space-y-4 rounded-lg border p-4">
      <h4 className="text-sm font-medium">{m.status_addEndpoint()}</h4>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <form.Field name="key">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_endpointKey()}</Label>
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
          <form.Field name="displayName">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_displayName()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder={m.placeholder_serviceName()}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="internalMode">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_internalMode()}</Label>
                <Select
                  onValueChange={(value: string) => {
                    field.handleChange(value as 'directUrl' | 'traefikHost')
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="traefikHost">traefikHost</SelectItem>
                    <SelectItem value="directUrl">directUrl</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <form.Field name="internalPath">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_internalPath()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="/health"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="internalMode">
            {(field) =>
              field.state.value === 'directUrl' ? (
                <form.Field name="internalUrl">
                  {(urlField) => (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">
                        {m.status_internalUrl()}
                      </Label>
                      <Input
                        onBlur={urlField.handleBlur}
                        onChange={(e) => {
                          urlField.handleChange(e.target.value)
                        }}
                        placeholder="http://service:3000/health"
                        value={urlField.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              ) : (
                <form.Field name="internalHost">
                  {(hostField) => (
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label className="text-xs">
                        {m.status_internalHost()}
                      </Label>
                      <Input
                        onBlur={hostField.handleBlur}
                        onChange={(e) => {
                          hostField.handleChange(e.target.value)
                        }}
                        placeholder="example.com"
                        value={hostField.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Field>
          <form.Field name="publicUrl">
            {(field) => (
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">{m.status_publicUrl()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="https://example.com"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="intervalSec">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_intervalSec()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="timeoutMs">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_timeoutMs()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
          <form.Field name="degradedMs">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">{m.status_degradedMs()}</Label>
                <Input
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setIsOpen(false)
              form.reset()
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            {m.common_cancel()}
          </Button>
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button disabled={isSubmitting} size="sm" type="submit">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {m.status_createEndpoint()}
              </Button>
            )}
          </form.Subscribe>
        </div>
      </form>
    </div>
  )
}

const AddServiceSection = () => {
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)

  const form = useForm({
    defaultValues: {
      name: '',
      primaryDomain: '',
      publicStatusHost: '',
      slug: '',
    },
    onSubmit: async ({ value }) => {
      await createStatusService({
        data: {
          name: value.name.trim(),
          primaryDomain:
            value.primaryDomain.trim().length > 0
              ? value.primaryDomain.trim()
              : null,
          publicStatusHost: value.publicStatusHost.trim(),
          slug: value.slug.trim(),
        },
      })

      form.reset()
      setIsOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['status-services'] })
    },
  })

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          setIsOpen(true)
        }}
        size="sm"
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {m.status_addService()}
      </Button>
    )
  }

  return (
    <Card className="transition-all duration-300 ease-out">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{m.status_addService()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="slug">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.status_slug()}</Label>
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
            <form.Field name="name">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.status_serviceName()}</Label>
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
            <form.Field name="publicStatusHost">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.status_publicStatusHost()}
                  </Label>
                  <Input
                    onBlur={field.handleBlur}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder="status.example.com"
                    required
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="primaryDomain">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.status_primaryDomain()}</Label>
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
          </div>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => {
                setIsOpen(false)
                form.reset()
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {m.common_cancel()}
            </Button>
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} size="sm" type="submit">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {m.status_createService()}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function StatusPage() {
  const servicesQuery = useQuery({
    queryFn: () => getStatusServices(),
    queryKey: ['status-services'],
    refetchInterval: 10_000,
  })

  const renderContent = () => {
    if (servicesQuery.isPending) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-6">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )
    }

    if (servicesQuery.isError) {
      return (
        <Card>
          <CardContent className="text-muted-foreground p-8 text-center text-sm">
            {m.status_failedToLoad()}
          </CardContent>
        </Card>
      )
    }

    const services = servicesQuery.data

    if (services.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
              <Server className="text-muted-foreground h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">{m.status_noServices()}</p>
              <p className="text-muted-foreground text-sm">
                {m.status_description()}
              </p>
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {services.map((service) => (
          <Card
            className="transition-all duration-300 ease-out hover:shadow-md"
            key={service.id}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {service.publicStatusHost}
                    {service.primaryDomain !== null
                      ? ` · ${service.primaryDomain}`
                      : ''}
                  </p>
                </div>
                <Badge variant={service.enabled ? 'success' : 'secondary'}>
                  {service.enabled ? m.status_active() : m.common_disabled()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                  {m.status_endpoints()}
                </h3>
                {service.endpoints.length === 0 ? (
                  <p className="text-muted-foreground py-3 text-sm">
                    {m.status_noEndpoints()}
                  </p>
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
                <AddEndpointSection serviceId={service.id} />
              </div>

              <Separator />

              <DokploySection
                initial={service.dokploy}
                key={service.dokploy?.refId ?? 'new'}
                serviceId={service.id}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <Header title={m.status_title()} />
      <div className="flex-1 space-y-8 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="text-muted-foreground h-5 w-5" />
              <h2 className="text-xl font-semibold tracking-tight">
                {m.status_services()}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {m.status_description()}
            </p>
          </div>
          <AddServiceSection />
        </div>

        {renderContent()}
      </div>
    </>
  )
}
