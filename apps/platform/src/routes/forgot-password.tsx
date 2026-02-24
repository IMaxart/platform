import { authClient } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

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
        const result = await authClient.forgetPassword({
          email: value.email,
          redirectTo: '/reset-password',
        })

        if (result.error) {
          setError(result.error.message ?? 'Failed to send reset email')
          return
        }

        setSent(true)
      } catch {
        setError('An unexpected error occurred')
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
            {sent ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {sent
              ? `We sent a reset link to ${getDisplayEmail()}`
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {sent ? (
          <Link className="block" to="/login">
            <Button className="w-full" variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to sign in
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
                  <Label htmlFor="email">Email</Label>
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

            {error ? (
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
                  Send reset link
                </Button>
              )}
            </form.Subscribe>

            <Link
              className="text-muted-foreground hover:text-foreground block text-center text-sm transition-colors"
              to="/login"
            >
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
