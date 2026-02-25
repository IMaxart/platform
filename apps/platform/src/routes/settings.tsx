import { authClient, useSession } from '@platform/auth/client'
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
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Fingerprint,
  Loader2,
  ShieldCheck,
  Trash2,
  User,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { ImageUpload } from '~/components/image-upload'
import { Header } from '~/components/layout/header'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/settings')({
  component: UserSettingsPage,
})

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
      const passkeyName = prompt(m.settings_passkeyPrompt())
      const result = await authClient.passkey.addPasskey({
        ...(passkeyName !== null ? { name: passkeyName } : {}),
      })
      if (result.error) {
        setError(result.error.message ?? m.settings_failedToAddPasskey())
        setLoading(false)
        return
      }
      void passkeysQuery.refetch()
    } catch {
      setError(m.settings_failedToAddPasskey())
    }
    setLoading(false)
  }, [passkeysQuery])

  const handleDeletePasskey = useCallback(
    async (id: string) => {
      if (!confirm(m.settings_removePasskeyConfirm())) return
      setError(null)
      try {
        const result = await authClient.passkey.deletePasskey({ id })
        if (result.error) {
          setError(result.error.message ?? m.settings_failedToRemovePasskey())
          return
        }
        void passkeysQuery.refetch()
      } catch {
        setError(m.settings_failedToRemovePasskey())
      }
    },
    [passkeysQuery],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5" />
          {m.settings_passkeys()}
        </CardTitle>
        <CardDescription>{m.settings_passkeysDescription()}</CardDescription>
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
                  {passkey.name ?? m.settings_unnamedPasskey()}
                </p>
                <p className="text-muted-foreground text-xs">
                  {m.settings_created()}{' '}
                  {new Date(passkey.createdAt).toLocaleDateString()}
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
              {m.settings_noPasskeysYet()}
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
          {m.settings_addPasskey()}
        </Button>

        {error !== null && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ProfileSection() {
  const { data: session, refetch } = useSession()
  const [name, setName] = useState<null | string>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const currentName = session?.user.name ?? ''
  const displayName = name ?? currentName
  const hasChanges = name !== null && name !== currentName

  const handleSave = useCallback(async () => {
    if (!hasChanges) return
    setSaving(true)
    try {
      await authClient.updateUser({ name: displayName })
      await refetch()
      setName(null)
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
      }, 2000)
    } catch {
      // save failed
    }
    setSaving(false)
  }, [displayName, hasChanges, refetch])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {m.settings_profile()}
        </CardTitle>
        <CardDescription>{m.settings_profileDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {session?.user && (
          <div className="flex items-center gap-4">
            <ImageUpload
              currentImage={session.user.image}
              entityId={session.user.id}
              entityType="user"
              fallback={session.user.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
              size="lg"
            />
            <div>
              <p className="font-medium">{session.user.name}</p>
              <p className="text-muted-foreground text-sm">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <Label>{m.settings_name()}</Label>
          <div className="flex gap-2">
            <Input
              onChange={(e) => {
                setName(e.target.value)
              }}
              value={displayName}
            />
            <Button
              disabled={!hasChanges || saving}
              onClick={() => {
                void handleSave()
              }}
              variant={saved ? 'default' : 'outline'}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4" />
              ) : (
                m.common_save()
              )}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{m.settings_email()}</Label>
          <Input disabled value={session?.user.email ?? ''} />
        </div>
      </CardContent>
    </Card>
  )
}

function TwoFactorSection() {
  const { data: session } = authClient.useSession()
  const [totpUri, setTotpUri] = useState<null | string>(null)
  const [backupCodes, setBackupCodes] = useState<null | string[]>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [password, setPassword] = useState('')
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [pendingAction, setPendingAction] = useState<
    'disable' | 'enable' | null
  >(null)
  const [error, setError] = useState<null | string>(null)
  const [loading, setLoading] = useState(false)

  const is2FAEnabled = session?.user.twoFactorEnabled ?? false

  const handleEnable2FA = useCallback(async () => {
    if (!password) return
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.twoFactor.enable({ password })
      if (result.error) {
        setError(result.error.message ?? 'Failed to enable 2FA')
        setLoading(false)
        return
      }
      setTotpUri(result.data.totpURI)
      setBackupCodes(result.data.backupCodes)
      setShowPasswordField(false)
      setPassword('')
      setPendingAction(null)
    } catch {
      setError('Failed to enable 2FA')
    }
    setLoading(false)
  }, [password])

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
    if (!password) return
    setError(null)
    setLoading(true)
    try {
      const result = await authClient.twoFactor.disable({ password })
      if (result.error) {
        setError(result.error.message ?? 'Failed to disable 2FA')
      } else {
        setShowPasswordField(false)
        setPassword('')
        setPendingAction(null)
      }
    } catch {
      setError('Failed to disable 2FA')
    }
    setLoading(false)
  }, [password])

  const startAction = (action: 'disable' | 'enable') => {
    setShowPasswordField(true)
    setPendingAction(action)
    setError(null)
    setPassword('')
  }

  const submitPassword = () => {
    if (pendingAction === 'enable') {
      void handleEnable2FA()
    } else if (pendingAction === 'disable') {
      void handleDisable2FA()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {m.settings_twoFactorAuth()}
        </CardTitle>
        <CardDescription>{m.settings_twoFactorDescription()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {is2FAEnabled && totpUri === null ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default">{m.common_enabled()}</Badge>
              <span className="text-muted-foreground text-sm">
                {m.settings_twoFactorActive()}
              </span>
            </div>
            <Button
              disabled={loading}
              onClick={() => {
                startAction('disable')
              }}
              variant="destructive"
            >
              {m.settings_disable2FA()}
            </Button>
          </div>
        ) : totpUri !== null ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm">{m.settings_scanQRCode()}</p>
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

            {backupCodes !== null && backupCodes.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {m.settings_saveBackupCodes()}
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
                onChange={(e) => {
                  setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }}
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
                {m.settings_verifyAndEnable()}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            disabled={loading}
            onClick={() => {
              startAction('enable')
            }}
          >
            {m.settings_enable2FA()}
          </Button>
        )}

        {showPasswordField && (
          <div className="space-y-2 rounded-lg border p-4">
            <Label className="text-sm">
              {m.settings_enterPasswordTo()}{' '}
              {pendingAction === 'enable'
                ? m.settings_enable()
                : m.settings_disable()}{' '}
              2FA
            </Label>
            <div className="flex items-center gap-2">
              <Input
                className="max-w-[300px]"
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    submitPassword()
                  }
                }}
                placeholder={m.settings_yourPassword()}
                type="password"
                value={password}
              />
              <Button disabled={!password || loading} onClick={submitPassword}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {m.common_confirm()}
              </Button>
              <Button
                onClick={() => {
                  setShowPasswordField(false)
                  setPassword('')
                  setPendingAction(null)
                  setError(null)
                }}
                variant="ghost"
              >
                {m.common_cancel()}
              </Button>
            </div>
          </div>
        )}

        {error !== null && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function UserSettingsPage() {
  return (
    <>
      <Header title={m.settings_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <ProfileSection />

        <Separator />
        <h2 className="pt-2 text-lg font-semibold">{m.settings_security()}</h2>

        <TwoFactorSection />
        <PasskeySection />
      </div>
    </>
  )
}
