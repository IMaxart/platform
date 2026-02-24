import { authClient } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

export const Route = createFileRoute('/2fa/verify')({
  component: TwoFactorVerifyPage,
})

function TwoFactorVerifyPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<null | string>(null)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const verify = useCallback(
    async (code: string) => {
      setError(null)

      try {
        const result = await authClient.twoFactor.verifyTotp({ code })

        if (result.error) {
          setError(result.error.message ?? 'Invalid code')
          inputRef.current?.focus()
          return
        }

        await navigate({ to: '/' })
      } catch {
        setError('Verification failed')
      }
    },
    [navigate],
  )

  const form = useForm({
    defaultValues: { code: '' },
    onSubmit: async ({ value }) => {
      await verify(value.code)
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <ShieldCheck className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Two-factor authentication
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {useBackupCode
              ? 'Enter one of your backup codes'
              : 'Enter the 6-digit code from your authenticator app'}
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="code">
            {(field) => (
              <Input
                autoComplete="one-time-code"
                className="text-center text-lg tracking-[0.5em]"
                inputMode={useBackupCode ? 'text' : 'numeric'}
                maxLength={useBackupCode ? 20 : 6}
                onChange={(e) => {
                  const raw = useBackupCode
                    ? e.target.value
                    : e.target.value.replace(/\D/g, '').slice(0, 6)

                  field.handleChange(raw)

                  if (raw.length === 6 && !useBackupCode) {
                    void verify(raw)
                  }
                }}
                placeholder={useBackupCode ? 'Backup code' : '000000'}
                ref={inputRef}
                value={field.state.value}
              />
            )}
          </form.Field>

          {error ? (
            <p className="text-destructive text-center text-sm font-medium">
              {error}
            </p>
          ) : null}

          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(isSubmitting) => (
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify
              </Button>
            )}
          </form.Subscribe>
        </form>

        <button
          className="text-muted-foreground hover:text-foreground mt-6 block w-full text-center text-sm transition-colors"
          onClick={() => {
            setUseBackupCode(!useBackupCode)
            form.reset()
            setError(null)
          }}
          type="button"
        >
          {useBackupCode
            ? 'Use authenticator app instead'
            : 'Use a backup code'}
        </button>
      </div>
    </div>
  )
}
