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
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui/components/select'
import { Switch } from '@platform/ui/components/switch'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link, useParams } from '@tanstack/react-router'
import {
  Activity,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  Pencil,
  Plus,
  Server,
  Trash2,
} from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  createStatusEndpoint,
  deleteStatusEndpoint,
  getServiceStatusDetail,
  updateStatusEndpoint,
} from '~/lib/server/status-queries'
import * as m from '~/paraglide/messages'

type EndpointStatus = 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'UP'

const STATUS_BADGE_VARIANT: Record<
  EndpointStatus,
  'danger' | 'secondary' | 'success' | 'warning'
> = {
  DEGRADED: 'warning',
  DOWN: 'danger',
  UNKNOWN: 'secondary',
  UP: 'success',
}

const translateStatus = (status: EndpointStatus) => {
  if (status === 'UP') return m.status_up()
  if (status === 'DEGRADED') return m.status_degraded()
  if (status === 'DOWN') return m.status_down()
  return m.common_unknown()
}

const formatTimeAgo = (date: Date | string) => {
  const now = Date.now()
  const then = new Date(date).getTime()
  const diffSec = Math.floor((now - then) / 1000)

  if (diffSec < 60)
    return m.serviceStatus_lastCheckAgo({ time: `${String(diffSec)}s` })
  if (diffSec < 3600)
    return m.serviceStatus_lastCheckAgo({
      time: `${String(Math.floor(diffSec / 60))}m`,
    })
  return m.serviceStatus_lastCheckAgo({
    time: `${String(Math.floor(diffSec / 3600))}h ${String(Math.floor((diffSec % 3600) / 60))}m`,
  })
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/status',
)({
  component: ServiceStatusPage,
})

type EndpointData = {
  degradedMs: number
  displayName: string
  enabled: boolean
  expectedStatusMax: number
  expectedStatusMin: number
  id: string
  internalHost: null | string
  internalMode: string
  internalPath: string
  internalUrl: null | string
  intervalSec: number
  key: string
  latestCheck: null | {
    checkedAt: Date | string
    degraded: boolean
    latencyMs: null | number
    ok: boolean
  }
  method: string
  publicLabel: null | string
  publicUrl: null | string
  status: string
  timeoutMs: number
  warnMs: number
}

type EndpointDialogProps = {
  endpoint: EndpointData | null
  onOpenChange: (open: boolean) => void
  open: boolean
  serviceId: string
}

type EndpointFormValues = {
  degradedMs: number
  displayName: string
  enabled: boolean
  expectedStatusMax: number
  expectedStatusMin: number
  internalHost: string
  internalMode: string
  internalPath: string
  internalUrl: string
  intervalSec: number
  key: string
  method: string
  publicLabel: string
  publicUrl: string
  timeoutMs: number
  warnMs: number
}

const EMPTY_FORM: EndpointFormValues = {
  degradedMs: 5000,
  displayName: '',
  enabled: true,
  expectedStatusMax: 299,
  expectedStatusMin: 200,
  internalHost: '',
  internalMode: 'directUrl',
  internalPath: '/health',
  internalUrl: '',
  intervalSec: 60,
  key: '',
  method: 'GET',
  publicLabel: '',
  publicUrl: '',
  timeoutMs: 10000,
  warnMs: 2000,
}

function EndpointDialog({
  endpoint,
  onOpenChange,
  open,
  serviceId,
}: EndpointDialogProps) {
  const queryClient = useQueryClient()
  const isEdit = endpoint !== null

  const defaultValues: EndpointFormValues = endpoint
    ? {
        degradedMs: endpoint.degradedMs,
        displayName: endpoint.displayName,
        enabled: endpoint.enabled,
        expectedStatusMax: endpoint.expectedStatusMax,
        expectedStatusMin: endpoint.expectedStatusMin,
        internalHost: endpoint.internalHost ?? '',
        internalMode: endpoint.internalMode,
        internalPath: endpoint.internalPath,
        internalUrl: endpoint.internalUrl ?? '',
        intervalSec: endpoint.intervalSec,
        key: endpoint.key,
        method: endpoint.method,
        publicLabel: endpoint.publicLabel ?? '',
        publicUrl: endpoint.publicUrl ?? '',
        timeoutMs: endpoint.timeoutMs,
        warnMs: endpoint.warnMs,
      }
    : EMPTY_FORM

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (isEdit) {
        await updateStatusEndpoint({
          data: {
            id: endpoint.id,
            patch: {
              degradedMs: value.degradedMs,
              displayName: value.displayName,
              enabled: value.enabled,
              expectedStatusMax: value.expectedStatusMax,
              expectedStatusMin: value.expectedStatusMin,
              internalHost: value.internalHost || null,
              internalMode: value.internalMode,
              internalPath: value.internalPath,
              internalUrl: value.internalUrl || null,
              intervalSec: value.intervalSec,
              key: value.key,
              method: value.method,
              publicLabel: value.publicLabel || null,
              publicUrl: value.publicUrl || null,
              timeoutMs: value.timeoutMs,
              warnMs: value.warnMs,
            },
          },
        })
      } else {
        const key =
          value.key ||
          value.displayName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        await createStatusEndpoint({
          data: {
            degradedMs: value.degradedMs,
            displayName: value.displayName,
            expectedStatusMax: value.expectedStatusMax,
            expectedStatusMin: value.expectedStatusMin,
            internalHost: value.internalHost || null,
            internalMode: value.internalMode as 'directUrl' | 'traefikHost',
            internalPath: value.internalPath,
            internalUrl: value.internalUrl || null,
            intervalSec: value.intervalSec,
            key,
            method: value.method as 'GET' | 'HEAD',
            publicLabel: value.publicLabel || null,
            publicUrl: value.publicUrl || null,
            serviceId,
            timeoutMs: value.timeoutMs,
            warnMs: value.warnMs,
          },
        })
      }

      void queryClient.invalidateQueries({
        queryKey: ['service-status', serviceId],
      })
      onOpenChange(false)
    },
  })

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? m.serviceStatus_editEndpoint()
              : m.serviceStatus_addEndpoint()}
          </DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="displayName">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_displayName()}
                  </Label>
                  <Input
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
            <form.Field name="key">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_key()}{' '}
                    <span className="text-muted-foreground">
                      {m.services_slugAuto()}
                    </span>
                  </Label>
                  <Input
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                    placeholder="health-check"
                    value={field.state.value}
                  />
                </div>
              )}
            </form.Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="method">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">{m.serviceStatus_method()}</Label>
                  <Select
                    onValueChange={(v) => {
                      field.handleChange(v)
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="HEAD">HEAD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <form.Field name="internalMode">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_internalMode()}
                  </Label>
                  <Select
                    onValueChange={(v) => {
                      field.handleChange(v)
                    }}
                    value={field.state.value}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="directUrl">
                        {m.serviceStatus_internalModeDirect()}
                      </SelectItem>
                      <SelectItem value="traefikHost">
                        {m.serviceStatus_internalModeTraefik()}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>

          <form.Subscribe selector={(s) => s.values.internalMode}>
            {(mode) =>
              mode === 'directUrl' ? (
                <form.Field name="internalUrl">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {m.serviceStatus_internalUrl()}
                      </Label>
                      <Input
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                        placeholder="http://my-service:8080"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              ) : (
                <form.Field name="internalHost">
                  {(field) => (
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {m.serviceStatus_internalHost()}
                      </Label>
                      <Input
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                        placeholder="my-service.docker"
                        value={field.state.value}
                      />
                    </div>
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          <form.Field name="internalPath">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {m.serviceStatus_internalPath()}
                </Label>
                <Input
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

          <form.Field name="publicUrl">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {m.serviceStatus_publicUrl()}{' '}
                  <span className="text-muted-foreground">
                    {m.common_optional()}
                  </span>
                </Label>
                <Input
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="https://api.example.com/health"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="publicLabel">
            {(field) => (
              <div className="space-y-1.5">
                <Label className="text-xs">
                  {m.serviceStatus_publicLabel()}{' '}
                  <span className="text-muted-foreground">
                    {m.common_optional()}
                  </span>
                </Label>
                <Input
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="api.example.com"
                  value={field.state.value}
                />
                <p className="text-muted-foreground text-[11px]">
                  {m.serviceStatus_publicLabelHint()}
                </p>
              </div>
            )}
          </form.Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <form.Field name="intervalSec">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_interval()}
                  </Label>
                  <Input
                    min={10}
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
                  <Label className="text-xs">{m.serviceStatus_timeout()}</Label>
                  <Input
                    min={100}
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
            <form.Field name="degradedMs">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_degradedThreshold()}
                  </Label>
                  <Input
                    min={100}
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

          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="expectedStatusMin">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_expectedStatus()} (min)
                  </Label>
                  <Input
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
            <form.Field name="expectedStatusMax">
              {(field) => (
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {m.serviceStatus_expectedStatus()} (max)
                  </Label>
                  <Input
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

          {isEdit && (
            <form.Field name="enabled">
              {(field) => (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <Label>{m.serviceStatus_enabled()}</Label>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(v) => {
                      field.handleChange(v)
                    }}
                  />
                </div>
              )}
            </form.Field>
          )}

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

function ServiceStatusPage() {
  const { projectId, serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/status',
  })
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEndpoint, setEditingEndpoint] = useState<EndpointData | null>(
    null,
  )

  const statusQuery = useQuery({
    queryFn: () => getServiceStatusDetail({ data: serviceId }),
    queryKey: ['service-status', serviceId],
    refetchInterval: 10_000,
  })

  const deleteMutation = useMutation({
    mutationFn: (endpointId: string) =>
      deleteStatusEndpoint({ data: { endpointId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['service-status', serviceId],
      })
    },
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
  const endpoints = (service.endpoints ?? []) as EndpointData[]

  const handleOpenCreate = () => {
    setEditingEndpoint(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (ep: EndpointData) => {
    setEditingEndpoint(ep)
    setDialogOpen(true)
  }

  const handleDelete = (endpointId: string) => {
    deleteMutation.mutate(endpointId)
  }

  return (
    <>
      <Header title={m.serviceStatus_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        {publicHost !== null && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{m.serviceStatus_publicPage()}</CardTitle>
                  <CardDescription>{publicHost}</CardDescription>
                </div>
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
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  {m.status_endpoints()}
                </CardTitle>
                <CardDescription>
                  {m.serviceStatus_description()}
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreate} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                {m.serviceStatus_addEndpoint()}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {endpoints.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                  <Server className="text-muted-foreground h-5 w-5" />
                </div>
                <p className="text-muted-foreground text-sm">
                  {m.status_noEndpoints()}
                </p>
                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Info className="h-3.5 w-3.5" />
                  {m.serviceStatus_monitoringInfo()}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {endpoints.map((endpoint) => {
                  const status = endpoint.status as EndpointStatus
                  const latencyMs = endpoint.latestCheck?.latencyMs
                  const latency =
                    latencyMs === null || latencyMs === undefined
                      ? '—'
                      : `${String(latencyMs)}ms`
                  const lastCheck = endpoint.latestCheck?.checkedAt

                  return (
                    <div className="rounded-lg border p-4" key={endpoint.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {endpoint.displayName}
                            </span>
                            <span className="text-muted-foreground font-mono text-xs">
                              {endpoint.key}
                            </span>
                            <Badge variant={STATUS_BADGE_VARIANT[status]}>
                              {translateStatus(status)}
                            </Badge>
                          </div>

                          <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span>
                              {endpoint.method} {endpoint.internalPath}
                            </span>
                            <span>
                              {m.serviceStatus_interval()}:{' '}
                              {endpoint.intervalSec}s
                            </span>
                            <span>
                              {m.status_latency()}: {latency}
                            </span>
                            {lastCheck !== null && lastCheck !== undefined && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimeAgo(lastCheck)}
                              </span>
                            )}
                            {(lastCheck === null ||
                              lastCheck === undefined) && (
                              <span className="flex items-center gap-1 text-amber-500">
                                <Info className="h-3 w-3" />
                                {m.serviceStatus_noChecksYet()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            onClick={() => {
                              handleOpenEdit(endpoint)
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              handleDelete(endpoint.id)
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {!endpoint.enabled && (
                        <Badge className="mt-2" variant="outline">
                          {m.common_disabled()}
                        </Badge>
                      )}
                    </div>
                  )
                })}

                <div className="text-muted-foreground flex items-center gap-1.5 pt-2 text-xs">
                  <Info className="h-3.5 w-3.5 shrink-0" />
                  {m.serviceStatus_monitoringInfo()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <EndpointDialog
        endpoint={editingEndpoint}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingEndpoint(null)
        }}
        open={dialogOpen}
        serviceId={serviceId}
      />
    </>
  )
}
