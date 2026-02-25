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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Plus, Server } from 'lucide-react'
import { useMemo, useState } from 'react'

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

const getStatusLabel = ({ status }: { status: EndpointStatus }) => {
  if (status === 'UP') return 'Up'
  if (status === 'DEGRADED') return 'Degraded'
  if (status === 'DOWN') return 'Down'
  return 'Unknown'
}

type NewServiceForm = {
  name: string
  primaryDomain: string
  publicStatusHost: string
  slug: string
}

const EMPTY_SERVICE_FORM: NewServiceForm = {
  name: '',
  primaryDomain: '',
  publicStatusHost: '',
  slug: '',
}

type NewEndpointForm = {
  degradedMs: string
  displayName: string
  internalHost: string
  internalMode: 'directUrl' | 'traefikHost'
  internalPath: string
  internalUrl: string
  intervalSec: string
  key: string
  publicUrl: string
  timeoutMs: string
}

const EMPTY_ENDPOINT_FORM: NewEndpointForm = {
  degradedMs: '2000',
  displayName: '',
  internalHost: '',
  internalMode: 'traefikHost',
  internalPath: '/',
  internalUrl: '',
  intervalSec: '60',
  key: '',
  publicUrl: '',
  timeoutMs: '5000',
}

type DokployForm = {
  refId: string
  type: DokployRefType
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
  const [form, setForm] = useState<DokployForm>({
    refId: initial?.refId ?? '',
    type: (initial?.type as DokployRefType | undefined) ?? 'application',
  })

  const canSave = form.refId.trim().length > 0

  const mutation = useMutation({
    mutationFn: async () => {
      await upsertStatusDokploy({
        data: {
          refId: form.refId.trim(),
          serviceId,
          type: form.type,
        },
      })
    },
    onSuccess: async () => {
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
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_dokployType()}</Label>
          <Select
            onValueChange={(value: string) => {
              setForm({
                ...form,
                type: value as DokployRefType,
              })
            }}
            value={form.type}
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
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_dokployRefId()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, refId: e.target.value })
            }}
            placeholder="applicationId / composeId"
            value={form.refId}
          />
        </div>
      </div>
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        <span>
          {m.status_lastDeployed()}: {lastDeployed} · {m.status_lastSync()}:{' '}
          {lastSync}
        </span>
        <Button
          disabled={!canSave || mutation.isPending}
          onClick={() => {
            mutation.mutate()
          }}
          size="sm"
          variant="outline"
        >
          {m.status_saveDokploy()}
        </Button>
      </div>
    </div>
  )
}

const AddEndpointSection = ({ serviceId }: { serviceId: string }) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<NewEndpointForm>(EMPTY_ENDPOINT_FORM)
  const [isOpen, setIsOpen] = useState(false)

  const canSubmit = useMemo(() => {
    if (form.key.trim().length === 0) return false
    if (form.displayName.trim().length === 0) return false
    if (form.internalPath.trim().length === 0) return false
    if (form.internalMode === 'directUrl')
      return form.internalUrl.trim().length > 0
    return form.internalHost.trim().length > 0
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      const intervalSec = Number.parseInt(form.intervalSec, 10)
      const timeoutMs = Number.parseInt(form.timeoutMs, 10)
      const degradedMs = Number.parseInt(form.degradedMs, 10)

      await createStatusEndpoint({
        data: {
          degradedMs: Number.isFinite(degradedMs) ? degradedMs : 2000,
          displayName: form.displayName.trim(),
          internalHost:
            form.internalHost.trim().length > 0
              ? form.internalHost.trim()
              : null,
          internalMode: form.internalMode,
          internalPath: form.internalPath.trim(),
          internalUrl:
            form.internalUrl.trim().length > 0 ? form.internalUrl.trim() : null,
          intervalSec: Number.isFinite(intervalSec) ? intervalSec : 60,
          key: form.key.trim(),
          publicUrl:
            form.publicUrl.trim().length > 0 ? form.publicUrl.trim() : null,
          serviceId,
          timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
        },
      })
    },
    onSuccess: async () => {
      setForm(EMPTY_ENDPOINT_FORM)
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_endpointKey()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, key: e.target.value })
            }}
            placeholder="frontend"
            value={form.key}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_displayName()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, displayName: e.target.value })
            }}
            placeholder="Frontend"
            value={form.displayName}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_internalMode()}</Label>
          <Select
            onValueChange={(value: string) => {
              setForm({
                ...form,
                internalMode: value as 'directUrl' | 'traefikHost',
              })
            }}
            value={form.internalMode}
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
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_internalPath()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, internalPath: e.target.value })
            }}
            placeholder="/health"
            value={form.internalPath}
          />
        </div>
        {form.internalMode === 'directUrl' ? (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{m.status_internalUrl()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, internalUrl: e.target.value })
              }}
              placeholder="http://service:3000/health"
              value={form.internalUrl}
            />
          </div>
        ) : (
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs">{m.status_internalHost()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, internalHost: e.target.value })
              }}
              placeholder="example.com"
              value={form.internalHost}
            />
          </div>
        )}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs">{m.status_publicUrl()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, publicUrl: e.target.value })
            }}
            placeholder="https://example.com"
            value={form.publicUrl}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_intervalSec()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, intervalSec: e.target.value })
            }}
            value={form.intervalSec}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_timeoutMs()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, timeoutMs: e.target.value })
            }}
            value={form.timeoutMs}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">{m.status_degradedMs()}</Label>
          <Input
            onChange={(e) => {
              setForm({ ...form, degradedMs: e.target.value })
            }}
            value={form.degradedMs}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button
          onClick={() => {
            setIsOpen(false)
            setForm(EMPTY_ENDPOINT_FORM)
          }}
          size="sm"
          variant="ghost"
        >
          {m.common_cancel()}
        </Button>
        <Button
          disabled={!canSubmit || mutation.isPending}
          onClick={() => {
            mutation.mutate()
          }}
          size="sm"
        >
          {m.status_createEndpoint()}
        </Button>
      </div>
    </div>
  )
}

const AddServiceSection = () => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<NewServiceForm>(EMPTY_SERVICE_FORM)
  const [isOpen, setIsOpen] = useState(false)

  const canSubmit = useMemo(() => {
    if (form.slug.trim().length === 0) return false
    if (form.name.trim().length === 0) return false
    return form.publicStatusHost.trim().length > 0
  }, [form])

  const mutation = useMutation({
    mutationFn: async () => {
      await createStatusService({
        data: {
          name: form.name.trim(),
          primaryDomain:
            form.primaryDomain.trim().length > 0
              ? form.primaryDomain.trim()
              : null,
          publicStatusHost: form.publicStatusHost.trim(),
          slug: form.slug.trim(),
        },
      })
    },
    onSuccess: async () => {
      setForm(EMPTY_SERVICE_FORM)
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
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">{m.status_slug()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, slug: e.target.value })
              }}
              placeholder="my-service"
              value={form.slug}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{m.status_serviceName()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, name: e.target.value })
              }}
              placeholder="My Service"
              value={form.name}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{m.status_publicStatusHost()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, publicStatusHost: e.target.value })
              }}
              placeholder="status.example.com"
              value={form.publicStatusHost}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{m.status_primaryDomain()}</Label>
            <Input
              onChange={(e) => {
                setForm({ ...form, primaryDomain: e.target.value })
              }}
              placeholder="example.com"
              value={form.primaryDomain}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              setIsOpen(false)
              setForm(EMPTY_SERVICE_FORM)
            }}
            size="sm"
            variant="ghost"
          >
            {m.common_cancel()}
          </Button>
          <Button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
            size="sm"
          >
            {m.status_createService()}
          </Button>
        </div>
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
            Failed to load services. Please try again.
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
                  {service.enabled ? 'Active' : 'Disabled'}
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
                            {getStatusLabel({
                              status: endpoint.status as EndpointStatus,
                            })}
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
