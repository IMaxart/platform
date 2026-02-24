import { authClient } from '@platform/auth/client'
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
import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Copy,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  getExcludedDevicesList,
  getProject,
  updateServiceConfig,
} from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

function PasskeySection() {
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)

  const passkeysQuery = useQuery({
    queryFn: async () => {
      const result = await authClient.passkey.listUserPasskeys()
      return result.data ?? []
    },
    queryKey: ['passkeys'],
  })

  const handleAddPasskey = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.passkey.addPasskey({
        name:
          prompt('Name this passkey (e.g. "MacBook Touch ID")') ?? undefined,
      })
      if (result?.error) {
        setError(result.error.message ?? 'Failed to add passkey')
        setLoading(false)
        return
      }
      void passkeysQuery.refetch()
    } catch {
      setError('Failed to add passkey')
    }
    setLoading(false)
  }, [passkeysQuery])

  const handleDeletePasskey = useCallback(
    async (id: string) => {
      if (!confirm('Remove this passkey?')) return
      setError(null)
      try {
        const result = await authClient.passkey.deletePasskey({ id })
        if (result?.error) {
          setError(result.error.message ?? 'Failed to remove passkey')
          return
        }
        void passkeysQuery.refetch()
      } catch {
        setError('Failed to remove passkey')
      }
    },
    [passkeysQuery],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          Passkeys
        </CardTitle>
        <CardDescription>
          Sign in with biometrics or hardware keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {passkeysQuery.data?.map((passkey) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={passkey.id}
            >
              <div>
                <p className="text-sm font-medium">
                  {passkey.name ?? 'Unnamed passkey'}
                </p>
                <p className="text-muted-foreground text-xs">
                  Created{' '}
                  {passkey.createdAt
                    ? new Date(passkey.createdAt).toLocaleDateString()
                    : 'unknown'}
                </p>
              </div>
              <Button
                onClick={() => {
                  void handleDeletePasskey(passkey.id)
                }}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          ))}
          {passkeysQuery.data?.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No passkeys registered yet
            </p>
          )}
        </div>

        <Button
          disabled={loading}
          onClick={() => {
            void handleAddPasskey()
          }}
          variant="outline"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Fingerprint className="mr-2 h-4 w-4" />
          )}
          Add passkey
        </Button>

        {error && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function SettingsPage() {
  const [copied, setCopied] = useState(false)
  const queryClient = useQueryClient()

  const project = useQuery({
    enabled: false,
    queryFn: () => getProject({ data: DEMO_PROJECT_ID }),
    queryKey: ['project', DEMO_PROJECT_ID],
  })

  const DEMO_SERVICE_ID = DEMO_PROJECT_ID

  const configMutation = useMutation({
    mutationFn: (config: {
      trackErrors: boolean
      trackEvents: boolean
      trackFeatureFlags: boolean
    }) =>
      updateServiceConfig({
        data: { serviceId: DEMO_SERVICE_ID, ...config },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['project', DEMO_PROJECT_ID],
      })
    },
  })

  const toggleFeature = (
    feature: 'trackErrors' | 'trackEvents' | 'trackFeatureFlags',
    enabled: boolean,
  ) => {
    configMutation.mutate({
      [feature]: enabled,
      trackErrors: true,
      trackEvents: true,
      trackFeatureFlags: false,
    })
  }

  const excludedDevices = useQuery({
    enabled: false,
    queryFn: () => getExcludedDevicesList({ data: DEMO_SERVICE_ID }),
    queryKey: ['excluded-devices', DEMO_SERVICE_ID],
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
      <Header title={m.settings_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.settings_title()}</CardTitle>
            <CardDescription>
              Project configuration and tracking setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{m.settings_projectName()}</Label>
              <Input readOnly value={project.data?.name ?? ''} />
            </div>
          </CardContent>
        </Card>

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
                checked={project.data?.trackEvents ?? true}
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
                checked={project.data?.trackErrors ?? true}
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
                checked={project.data?.trackFeatureFlags ?? false}
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
              <Button variant="outline">
                {m.settings_addExcludedDevice()}
              </Button>
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
                          <Button size="icon" variant="ghost">
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
        <Separator />
        <h2 className="pt-2 text-lg font-semibold">Security</h2>

        <TwoFactorSection />
        <PasskeySection />
      </div>
    </>
  )
}

function TwoFactorSection() {
  const { data: session } = authClient.useSession()
  const [totpUri, setTotpUri] = useState<null | string>(null)
  const [backupCodes, setBackupCodes] = useState<null | string[]>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)

  const is2FAEnabled = session?.user?.twoFactorEnabled ?? false

  const handleEnable2FA = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.twoFactor.enable({
        password: prompt('Enter your password to enable 2FA') ?? '',
      })
      if (result.error) {
        setError(result.error.message ?? 'Failed to enable 2FA')
        setLoading(false)
        return
      }
      setTotpUri(result.data?.totpURI ?? null)
      setBackupCodes(result.data?.backupCodes ?? null)
    } catch {
      setError('Failed to enable 2FA')
    }
    setLoading(false)
  }, [])

  const handleVerify = useCallback(async () => {
    if (verifyCode.length !== 6) return
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code: verifyCode,
      })
      if (result.error) {
        setError(result.error.message ?? 'Invalid code')
        setLoading(false)
        return
      }
      setTotpUri(null)
      setVerifyCode('')
    } catch {
      setError('Verification failed')
    }
    setLoading(false)
  }, [verifyCode])

  const handleDisable2FA = useCallback(async () => {
    const password = prompt('Enter your password to disable 2FA')
    if (!password) return
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.twoFactor.disable({
        password,
      })
      if (result.error) {
        setError(result.error.message ?? 'Failed to disable 2FA')
      }
    } catch {
      setError('Failed to disable 2FA')
    }
    setLoading(false)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          Add an extra layer of security with TOTP authenticator
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {is2FAEnabled && !totpUri ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default">Enabled</Badge>
              <span className="text-muted-foreground text-sm">
                Two-factor authentication is active
              </span>
            </div>
            <Button
              disabled={loading}
              onClick={() => {
                void handleDisable2FA()
              }}
              variant="destructive"
            >
              Disable 2FA
            </Button>
          </div>
        ) : totpUri ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm">
                Scan this QR code with your authenticator app (Google
                Authenticator, Authy, etc.)
              </p>
              <div className="rounded-lg bg-white p-4">
                <img
                  alt="TOTP QR Code"
                  height={200}
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`}
                  width={200}
                />
              </div>
              <code className="bg-muted max-w-full rounded px-3 py-2 text-xs break-all">
                {totpUri}
              </code>
            </div>

            {backupCodes && backupCodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Save these backup codes in a safe place:
                </p>
                <div className="bg-muted grid grid-cols-2 gap-2 rounded-lg p-4">
                  {backupCodes.map((code) => (
                    <code className="text-center text-sm" key={code}>
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Input
                className="max-w-[200px] text-center tracking-widest"
                inputMode="numeric"
                maxLength={6}
                onChange={(e) =>
                  { setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6)); }
                }
                placeholder="000000"
                value={verifyCode}
              />
              <Button
                disabled={loading || verifyCode.length !== 6}
                onClick={() => {
                  void handleVerify()
                }}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify & Enable
              </Button>
            </div>
          </div>
        ) : (
          <Button
            disabled={loading}
            onClick={() => {
              void handleEnable2FA()
            }}
          >
            Enable 2FA
          </Button>
        )}
        {error && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
