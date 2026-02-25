import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

import * as m from '~/paraglide/messages'

type PasswordResetResponse = {
  message: string
  status: boolean
}

const requestPasswordReset = async ({
  email,
  redirectTo,
}: {
  email: string
  redirectTo: string
}): Promise<{ error: null | string }> => {
  const res = await fetch('/api/auth/forget-password', {
    body: JSON.stringify({ email, redirectTo }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null)
    const parsed = body as null | Partial<PasswordResetResponse>
    return { error: parsed?.message ?? m.forgotPassword_failedToSend() }
  }

  return { error: null }
}

export const Route = createFileRoute('/forgot-password')({
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const [error, setError] = useState<null | string>(null)
  const [sent, setSent] = useState(false)

  const form = useForm({
    defaultValues: { email: '' },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const result = await requestPasswordReset({
          email: value.email,
          redirectTo: '/reset-password',
        })

        if (result.error !== null) {
          setError(result.error)
          return
        }

        setSent(true)
      } catch {
        setError(m.common_unexpectedError())
      }
    },
  })

  const getDisplayEmail = () => form.state.values.email

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <Lock className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {sent ? m.forgotPassword_checkEmail() : m.forgotPassword_title()}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {sent
              ? `${m.forgotPassword_sentResetLink()} ${getDisplayEmail()}`
              : m.forgotPassword_description()}
          </p>
        </div>

        {sent ? (
          <Link className="block" to="/login">
            <Button className="w-full" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {m.forgotPassword_backToSignIn()}
            </Button>
          </Link>
        ) : (
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
                  <Label htmlFor="email">{m.forgotPassword_email()}</Label>
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

            {error !== null ? (
              <p className="text-destructive text-sm font-medium">{error}</p>
            ) : null}

            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button
                  className="w-full"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {m.forgotPassword_sendResetLink()}
                </Button>
              )}
            </form.Subscribe>

            <Link
              className="text-muted-foreground hover:text-foreground block text-center text-sm transition-colors"
              to="/login"
            >
              {m.forgotPassword_backToSignIn()}
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
