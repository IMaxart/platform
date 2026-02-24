import { authClient } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Fingerprint, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

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
          setError(result.error.message ?? 'Invalid credentials')
          return
        }

        if (
          (result.data as Record<string, unknown> | undefined)
            ?.twoFactorRedirect
        ) {
          await navigate({ to: '/2fa/verify' })
          return
        }

        await navigate({ to: '/' })
      } catch {
        setError('An unexpected error occurred')
      }
    },
  })

  const handlePasskey = async () => {
    setError(null)
    setPasskeyLoading(true)

    try {
      const result = await authClient.signIn.passkey()

      if (result?.error) {
        setError(result.error.message ?? 'Passkey authentication failed')
        setPasskeyLoading(false)
        return
      }

      await navigate({ to: '/' })
    } catch {
      setError('Passkey authentication failed')
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
            Sign in to Platform
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your credentials to continue
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
                <Label htmlFor="email">Email</Label>
                <Input
                  autoComplete="email"
                  id="email"
                  onBlur={field.handleBlur}
                  onChange={(e) => { field.handleChange(e.target.value); }}
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
                  <Label htmlFor="password">Password</Label>
                  <Link
                    className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                    to="/forgot-password"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  autoComplete="current-password"
                  id="password"
                  onBlur={field.handleBlur}
                  onChange={(e) => { field.handleChange(e.target.value); }}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                  type="password"
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          {error ? (
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
                  Sign in
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
            <span className="bg-background text-muted-foreground px-3">or</span>
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
              Sign in with passkey
            </Button>
          )}
        </form.Subscribe>

        <p className="text-muted-foreground mt-8 text-center text-xs">
          Access is by invitation only
        </p>
      </div>
    </div>
  )
}
