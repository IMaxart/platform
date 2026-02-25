import { authClient } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Fingerprint, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<null | string>(null)
  const [passkeyLoading, setPasskeyLoading] = useState(false)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const result = await authClient.signIn.email({
          email: value.email,
          password: value.password,
        })

        if (result.error) {
          setError(result.error.message ?? m.login_invalidCredentials())
          return
        }

        const data = result.data as Record<string, unknown> | undefined
        if (data?.['twoFactorRedirect'] === true) {
          await navigate({ to: '/2fa/verify' })
          return
        }

        await navigate({ to: '/' })
      } catch {
        setError(m.common_unexpectedError())
      }
    },
  })

  const handlePasskey = async () => {
    setError(null)
    setPasskeyLoading(true)

    try {
      const result = await authClient.signIn.passkey()

      if (result.error) {
        setError(result.error.message ?? m.login_passkeyFailed())
        setPasskeyLoading(false)
        return
      }

      await navigate({ to: '/' })
    } catch {
      setError(m.login_passkeyFailed())
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <Lock className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.login_title()}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {m.login_description()}
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="email">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="email">{m.login_email()}</Label>
                <Input
                  autoComplete="email"
                  id="email"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="you@example.com"
                  required
                  type="email"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{m.login_password()}</Label>
                  <Link
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                    to="/forgot-password"
                  >
                    {m.login_forgotPassword()}
                  </Link>
                </div>
                <Input
                  autoComplete="current-password"
                  id="password"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                  type="password"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          {error !== null ? (
            <p className="text-destructive text-sm font-medium">{error}</p>
          ) : null}

          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => {
              const isDisabled = isSubmitting || passkeyLoading
              return (
                <Button className="w-full" disabled={isDisabled} type="submit">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {m.login_signIn()}
                </Button>
              )
            }}
          </form.Subscribe>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background text-muted-foreground px-3">
              {m.common_or()}
            </span>
          </div>
        </div>

        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <Button
              className="w-full"
              disabled={isSubmitting || passkeyLoading}
              onClick={handlePasskey}
              variant="outline"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              {m.login_signInWithPasskey()}
            </Button>
          )}
        </form.Subscribe>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          {m.login_invitationOnly()}
        </p>
      </div>
    </div>
  )
}
