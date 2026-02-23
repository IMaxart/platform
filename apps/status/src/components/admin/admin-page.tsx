import type { AdminServicesResponse, DokployRefType } from '~/shared/api-types'

import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Input } from '@platform/ui/components/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { StatusBadge } from '~/components/status/status-badge'
import { fetchJson } from '~/lib/api-client'

const ADMIN_TOKEN_STORAGE_KEY = 'status.adminToken'

const getTokenFromStorage = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
}

const setTokenInStorage = ({ token }: { token: string }) => {
  window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token)
}

const clearTokenInStorage = () => {
  window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)
}

const useAdminToken = () => {
  const [token, setToken] = useState<null | string>(() => getTokenFromStorage())

  const tokenValue = token ?? ''

  return {
    token: {
      clear: () => {
        setToken(null)
        clearTokenInStorage()
      },
      isSet: tokenValue.length > 0,
      set: (next: string) => {
        setToken(next.length === 0 ? null : next)
        if (next.length === 0) {
          clearTokenInStorage()
          return
        }
        setTokenInStorage({ token: next })
      },
      value: tokenValue,
    },
  }
}

const adminHeaders = ({ token }: { token: string }) => {
  return {
    'x-admin-token': token,
  }
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

type NewServiceForm = {
  name: string
  primaryDomain: string
  publicStatusHost: string
  slug: string
}

const DokployConfigForm = ({
  initial,
  serviceId,
  token,
}: {
  initial: null | {
    lastDeployedAtMs: null | number
    lastSyncAtMs: number
    refId: string
    type: DokployRefType
  }
  serviceId: string
  token: string
}) => {
  const queryClient = useQueryClient()
  const [type, setType] = useState<DokployRefType>(
    initial?.type ?? 'application',
  )
  const [refId, setRefId] = useState<string>(initial?.refId ?? '')

  /* eslint-disable react-hooks/set-state-in-effect -- syncing state with prop changes */
  useEffect(() => {
    if (!initial) return
    setType(initial.type)
    setRefId(initial.refId)
  }, [initial])
  /* eslint-enable react-hooks/set-state-in-effect */

  const canSave = refId.trim().length > 0

  const save = useMutation({
    mutationFn: async () => {
      return await fetchJson({
        init: {
          body: JSON.stringify({
            refId: refId.trim(),
            type,
          }),
          headers: {
            ...adminHeaders({ token }),
            'content-type': 'application/json',
          },
          method: 'PATCH',
        },
        url: `/api/admin/services/${serviceId}/dokploy`,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminServices'] })
    },
  })

  const lastDeployed = initial?.lastDeployedAtMs
    ? new Date(initial.lastDeployedAtMs).toLocaleString()
    : '—'
  const lastSync = initial?.lastSyncAtMs
    ? new Date(initial.lastSyncAtMs).toLocaleString()
    : '—'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dokploy (optional)</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          onChange={(e) =>
            { setType(e.target.value === 'compose' ? 'compose' : 'application'); }
          }
          value={type}
        >
          <option value="application">application</option>
          <option value="compose">compose</option>
        </select>

        <Input
          onChange={(e) => { setRefId(e.target.value); }}
          placeholder="applicationId / composeId"
          value={refId}
        />

        <div className="text-muted-foreground text-xs sm:col-span-2">
          lastDeployedAt: {lastDeployed} • lastSyncAt: {lastSync}
        </div>

        <div className="flex justify-end sm:col-span-2">
          <Button
            disabled={!canSave || save.isPending}
            onClick={() => { save.mutate(); }}
          >
            Save Dokploy mapping
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const AddEndpointForm = ({
  serviceId,
  token,
}: {
  serviceId: string
  token: string
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<NewEndpointForm>({
    degradedMs: '2000',
    displayName: 'Frontend',
    internalHost: '',
    internalMode: 'traefikHost',
    internalPath: '/',
    internalUrl: '',
    intervalSec: '60',
    key: 'frontend',
    publicUrl: '',
    timeoutMs: '5000',
  })

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

      return await fetchJson({
        init: {
          body: JSON.stringify({
            degradedMs: Number.isFinite(degradedMs) ? degradedMs : 2000,
            displayName: form.displayName.trim(),
            internalHost:
              form.internalHost.trim().length > 0
                ? form.internalHost.trim()
                : null,
            internalMode: form.internalMode,
            internalPath: form.internalPath.trim(),
            internalUrl:
              form.internalUrl.trim().length > 0
                ? form.internalUrl.trim()
                : null,
            intervalSec: Number.isFinite(intervalSec) ? intervalSec : 60,
            key: form.key.trim(),
            publicUrl:
              form.publicUrl.trim().length > 0 ? form.publicUrl.trim() : null,
            serviceId,
            timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : 5000,
          }),
          headers: {
            ...adminHeaders({ token }),
            'content-type': 'application/json',
          },
          method: 'POST',
        },
        url: '/api/admin/endpoints',
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['adminServices'] })
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add endpoint</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Input
          onChange={(e) => { setForm({ ...form, key: e.target.value }); }}
          placeholder="key (frontend/api)"
          value={form.key}
        />
        <Input
          onChange={(e) => { setForm({ ...form, displayName: e.target.value }); }}
          placeholder="display name"
          value={form.displayName}
        />

        <select
          className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
          onChange={(e) =>
            { setForm({
              ...form,
              internalMode:
                e.target.value === 'directUrl' ? 'directUrl' : 'traefikHost',
            }); }
          }
          value={form.internalMode}
        >
          <option value="traefikHost">traefikHost</option>
          <option value="directUrl">directUrl</option>
        </select>
        <Input
          onChange={(e) => { setForm({ ...form, internalPath: e.target.value }); }}
          placeholder="internal path (e.g. /health or /)"
          value={form.internalPath}
        />

        {form.internalMode === 'directUrl' ? (
          <Input
            className="sm:col-span-2"
            onChange={(e) => { setForm({ ...form, internalUrl: e.target.value }); }}
            placeholder="internal URL (e.g. http://service:3000/health)"
            value={form.internalUrl}
          />
        ) : (
          <Input
            className="sm:col-span-2"
            onChange={(e) => { setForm({ ...form, internalHost: e.target.value }); }}
            placeholder="internal host (e.g. ingramkalina.pl)"
            value={form.internalHost}
          />
        )}

        <Input
          className="sm:col-span-2"
          onChange={(e) => { setForm({ ...form, publicUrl: e.target.value }); }}
          placeholder="public URL (optional)"
          value={form.publicUrl}
        />

        <Input
          onChange={(e) => { setForm({ ...form, intervalSec: e.target.value }); }}
          placeholder="intervalSec"
          value={form.intervalSec}
        />
        <Input
          onChange={(e) => { setForm({ ...form, timeoutMs: e.target.value }); }}
          placeholder="timeoutMs"
          value={form.timeoutMs}
        />

        <Input
          onChange={(e) => { setForm({ ...form, degradedMs: e.target.value }); }}
          placeholder="degradedMs"
          value={form.degradedMs}
        />
        <div className="flex items-center justify-end">
          <Button
            disabled={!canSubmit || mutation.isPending}
            onClick={() => { mutation.mutate(); }}
          >
            Create
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export const AdminPage = () => {
  const queryClient = useQueryClient()
  const admin = useAdminToken()
  const token = admin.token.value

  const servicesQuery = useQuery({
    enabled: admin.token.isSet,
    queryFn: async () => {
      return await fetchJson<AdminServicesResponse>({
        init: {
          headers: adminHeaders({ token }),
        },
        url: '/api/admin/services',
      })
    },
    queryKey: ['adminServices'],
    refetchInterval: 10_000,
  })

  const [newService, setNewService] = useState<NewServiceForm>({
    name: '',
    primaryDomain: '',
    publicStatusHost: '',
    slug: '',
  })

  const canCreateService = useMemo(() => {
    if (!admin.token.isSet) return false
    if (newService.slug.trim().length === 0) return false
    if (newService.name.trim().length === 0) return false
    if (newService.publicStatusHost.trim().length === 0) return false
    return true
  }, [admin.token.isSet, newService])

  const createService = useMutation({
    mutationFn: async () => {
      return await fetchJson({
        init: {
          body: JSON.stringify({
            name: newService.name.trim(),
            primaryDomain:
              newService.primaryDomain.trim().length > 0
                ? newService.primaryDomain.trim()
                : null,
            publicStatusHost: newService.publicStatusHost.trim(),
            slug: newService.slug.trim(),
          }),
          headers: {
            ...adminHeaders({ token }),
            'content-type': 'application/json',
          },
          method: 'POST',
        },
        url: '/api/admin/services',
      })
    },
    onSuccess: async () => {
      setNewService({
        name: '',
        primaryDomain: '',
        publicStatusHost: '',
        slug: '',
      })
      await queryClient.invalidateQueries({ queryKey: ['adminServices'] })
    },
  })

  const servicesContent = (() => {
    if (!admin.token.isSet) {
      return (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Set your token to load services.
          </CardContent>
        </Card>
      )
    }

    if (servicesQuery.isPending) {
      return (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Loading…
          </CardContent>
        </Card>
      )
    }

    if (servicesQuery.isError || !servicesQuery.data) {
      return (
        <Card>
          <CardContent className="p-6 text-sm">
            Failed to load admin services.
          </CardContent>
        </Card>
      )
    }

    return (
      <div className="grid gap-4">
        {servicesQuery.data.services.map((service) => {
          return (
            <Card key={service.id}>
              <CardHeader className="space-y-1">
                <CardTitle>{service.name}</CardTitle>
                <div className="text-muted-foreground text-sm">
                  {service.publicStatusHost}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  {service.endpoints.length === 0 ? (
                    <div className="text-muted-foreground text-sm">
                      No endpoints yet.
                    </div>
                  ) : (
                    service.endpoints.map((endpoint) => {
                      const state = endpoint.latest?.state ?? 'UNKNOWN'
                      const latency =
                        endpoint.latest?.latencyMs === null ||
                        endpoint.latest?.latencyMs === undefined
                          ? '—'
                          : `${endpoint.latest.latencyMs}ms`

                      return (
                        <div
                          className="flex items-center justify-between rounded-md border px-3 py-2"
                          key={endpoint.id}
                        >
                          <div>
                            <div className="font-medium">
                              {endpoint.displayName} ({endpoint.key})
                            </div>
                            <div className="text-muted-foreground text-xs">
                              latency: {latency}
                            </div>
                          </div>
                          <StatusBadge state={state} />
                        </div>
                      )
                    })
                  )}
                </div>

                <AddEndpointForm serviceId={service.id} token={token} />
                <DokployConfigForm
                  initial={service.deploy}
                  serviceId={service.id}
                  token={token}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  })()

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
        <div className="text-muted-foreground text-sm">
          Write operations require `ADMIN_WRITE_TOKEN` (stored only in your
          browser).
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin token</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            onChange={(e) => { admin.token.set(e.target.value); }}
            placeholder="x-admin-token"
            value={admin.token.value}
          />
          <Button onClick={() => servicesQuery.refetch()} variant="secondary">
            Refresh
          </Button>
          <Button onClick={() => { admin.token.clear(); }} variant="ghost">
            Clear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add service</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Input
            onChange={(e) =>
              { setNewService({ ...newService, slug: e.target.value }); }
            }
            placeholder="slug (e.g. ingramkalina)"
            value={newService.slug}
          />
          <Input
            onChange={(e) =>
              { setNewService({ ...newService, name: e.target.value }); }
            }
            placeholder="name (e.g. ingramkalina.pl)"
            value={newService.name}
          />
          <Input
            onChange={(e) =>
              { setNewService({ ...newService, primaryDomain: e.target.value }); }
            }
            placeholder="primaryDomain (optional)"
            value={newService.primaryDomain}
          />
          <Input
            onChange={(e) =>
              { setNewService({ ...newService, publicStatusHost: e.target.value }); }
            }
            placeholder="publicStatusHost (e.g. status.ingramkalina.pl)"
            value={newService.publicStatusHost}
          />

          <div className="flex justify-end sm:col-span-2">
            <Button
              disabled={!canCreateService || createService.isPending}
              onClick={() => { createService.mutate(); }}
            >
              Create service
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Services</h2>
        {servicesContent}
      </section>
    </main>
  )
}
