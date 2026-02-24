import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { Separator } from '@platform/ui/components/separator'
import { Switch } from '@platform/ui/components/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui/components/table'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  addExcludedDevice,
  deleteExcludedDevice,
  getExcludedDevicesList,
  getProjectServices,
  updateServiceConfig,
} from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/settings',
)({
  component: ServiceSettingsPage,
})

function ServiceSettingsPage() {
  const { projectId, serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/settings',
  })
  const [copied, setCopied] = useState(false)
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [deviceHash, setDeviceHash] = useState('')
  const queryClient = useQueryClient()

  const servicesQuery = useQuery({
    queryFn: () => getProjectServices({ data: projectId }),
    queryKey: ['services', projectId],
    refetchOnMount: 'always',
  })

  const service = servicesQuery.data?.find((s) => s.id === serviceId)

  const configMutation = useMutation({
    mutationFn: (config: {
      trackErrors: boolean
      trackEvents: boolean
      trackFeatureFlags: boolean
    }) =>
      updateServiceConfig({
        data: { serviceId, ...config },
      }),
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['services', projectId], context.previousData)
      }
    },
    onMutate: async (newConfig) => {
      await queryClient.cancelQueries({ queryKey: ['services', projectId] })
      const previousData = queryClient.getQueryData(['services', projectId])
      queryClient.setQueryData(
        ['services', projectId],
        (old: typeof servicesQuery.data) =>
          old?.map((s) => (s.id === serviceId ? { ...s, ...newConfig } : s)),
      )
      return { previousData }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: ['services', projectId],
      })
    },
  })

  const toggleFeature = (
    feature: 'trackErrors' | 'trackEvents' | 'trackFeatureFlags',
    enabled: boolean,
  ) => {
    configMutation.mutate({
      [feature]: enabled,
      trackErrors: service?.trackErrors ?? true,
      trackEvents: service?.trackEvents ?? true,
      trackFeatureFlags: service?.trackFeatureFlags ?? false,
    })
  }

  const excludedDevices = useQuery({
    queryFn: () => getExcludedDevicesList({ data: serviceId }),
    queryKey: ['excluded-devices', serviceId],
  })

  const addDeviceMutation = useMutation({
    mutationFn: (params: { name: string; visitorHash: string }) =>
      addExcludedDevice({
        data: { ...params, serviceId },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['excluded-devices', serviceId],
      })
      setShowAddDevice(false)
      setDeviceName('')
      setDeviceHash('')
    },
  })

  const deleteDeviceMutation = useMutation({
    mutationFn: (deviceId: string) =>
      deleteExcludedDevice({ data: { deviceId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['excluded-devices', serviceId],
      })
    },
  })

  const snippet = `<script defer src="https://analytics.yourdomain.com/t.js"></script>`

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <>
      <Header title="Service Settings" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.settings_features()}</CardTitle>
            <CardDescription>
              {m.settings_featuresDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{m.settings_trackEvents()}</Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_trackEventsDescription()}
                </p>
              </div>
              <Switch
                checked={service?.trackEvents ?? true}
                disabled={configMutation.isPending}
                onCheckedChange={(checked) => {
                  toggleFeature('trackEvents', checked)
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{m.settings_trackErrors()}</Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_trackErrorsDescription()}
                </p>
              </div>
              <Switch
                checked={service?.trackErrors ?? true}
                disabled={configMutation.isPending}
                onCheckedChange={(checked) => {
                  toggleFeature('trackErrors', checked)
                }}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{m.settings_trackFeatureFlags()}</Label>
                <p className="text-muted-foreground text-sm">
                  {m.settings_trackFeatureFlagsDescription()}
                </p>
              </div>
              <Switch
                checked={service?.trackFeatureFlags ?? false}
                disabled={configMutation.isPending}
                onCheckedChange={(checked) => {
                  toggleFeature('trackFeatureFlags', checked)
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{m.settings_trackingSnippet()}</CardTitle>
            <CardDescription>
              Add this snippet to your website to start tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md p-3 font-mono text-sm">
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
          <CardHeader>
            <CardTitle>{m.settings_excludedDevices()}</CardTitle>
            <CardDescription>
              These devices are tracked but hidden from statistics by default
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              {showAddDevice ? (
                <div className="space-y-3 rounded-lg border p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">
                        {m.settings_deviceName()}
                      </Label>
                      <Input
                        onChange={(e) => {
                          setDeviceName(e.target.value)
                        }}
                        placeholder="My Laptop"
                        value={deviceName}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Visitor hash</Label>
                      <Input
                        onChange={(e) => {
                          setDeviceHash(e.target.value)
                        }}
                        placeholder="abc123..."
                        value={deviceHash}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={
                        !deviceName ||
                        !deviceHash ||
                        addDeviceMutation.isPending
                      }
                      onClick={() => {
                        addDeviceMutation.mutate({
                          name: deviceName,
                          visitorHash: deviceHash,
                        })
                      }}
                      size="sm"
                    >
                      {addDeviceMutation.isPending ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      ) : null}
                      Add
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddDevice(false)
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => {
                    setShowAddDevice(true)
                  }}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {m.settings_addExcludedDevice()}
                </Button>
              )}
            </div>

            <Separator className="mb-4" />

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.settings_deviceName()}</TableHead>
                    <TableHead>{m.sessions_visitor()}</TableHead>
                    <TableHead>{m.settings_reason()}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excludedDevices.data && excludedDevices.data.length > 0 ? (
                    excludedDevices.data.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell>{device.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {device.visitorHash.slice(0, 12)}...
                        </TableCell>
                        <TableCell>
                          {device.reason ? (
                            <Badge variant="outline">{device.reason}</Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            disabled={deleteDeviceMutation.isPending}
                            onClick={() => {
                              deleteDeviceMutation.mutate(device.id)
                            }}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="text-destructive h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="text-center" colSpan={4}>
                        {m.common_noData()}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
