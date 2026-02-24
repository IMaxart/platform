import { authClient } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<null | string>(null)

  const form = useForm({
    defaultValues: { password: '' },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const result = await authClient.resetPassword({
          newPassword: value.password,
        })

        if (result.error) {
          setError(result.error.message ?? 'Failed to reset password')
          return
        }

        await navigate({ to: '/login' })
      } catch {
        setError('An unexpected error occurred')
      }
    },
  })

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <Lock className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Choose a new password
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Enter your new password below
          </p>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="password">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input
                  autoComplete="new-password"
                  id="password"
                  minLength={8}
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="Min. 8 characters"
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
            {(isSubmitting) => (
              <Button className="w-full" disabled={isSubmitting} type="submit">
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset password
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
      </div>
    </div>
  )
}
