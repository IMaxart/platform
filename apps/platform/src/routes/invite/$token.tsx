import { authClient, useSession } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Building2, Check, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  const { token } = Route.useParams()
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [joined, setJoined] = useState(false)

  const handleAccept = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const result = await authClient.organization.acceptInvitation({
        invitationId: token,
      })

      if (result.error) {
        setError(result.error.message ?? 'Failed to join team')
        setLoading(false)
        return
      }

      setJoined(true)
      setTimeout(() => {
        void navigate({ to: '/' })
      }, 2000)
    } catch {
      setError('Failed to join team')
      setLoading(false)
    }
  }, [token, navigate])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <Building2 className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Team Invitation
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            You need to sign in or create an account to accept this invitation
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/login">
              <Button className="w-full">Sign in</Button>
            </Link>
            <Link to="/register">
              <Button className="w-full" variant="outline">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
          {joined ? (
            <Check className="text-background h-5 w-5" />
          ) : (
            <Building2 className="text-background h-5 w-5" />
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {joined ? 'Welcome to the team!' : 'Team Invitation'}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {joined
            ? 'Redirecting you to the dashboard...'
            : 'You have been invited to join a team'}
        </p>

        {!joined && (
          <div className="mt-8 space-y-3">
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => {
                void handleAccept()
              }}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Accept invitation
            </Button>
            <Link
              className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
              to="/"
            >
              Decline and go to dashboard
            </Link>
          </div>
        )}

        {error && (
          <p className="text-destructive mt-4 text-sm font-medium">{error}</p>
        )}
      </div>
    </div>
  )
}
