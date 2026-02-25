import { authClient, useSession } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'

type AcceptInvitationResult = {
  data?: unknown
  error?: { message: string }
}
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { Building2, Check, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/invite/$token')({
  component: InvitePage,
})

function InvitePage() {
  const { token } = useParams({ from: '/invite/$token' })
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [joined, setJoined] = useState(false)

  const handleAccept = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const result = (await authClient.organization.acceptInvitation({
        invitationId: token,
      })) as AcceptInvitationResult

      if (result.error) {
        setError(result.error.message || m.invite_failedToJoin())
        setLoading(false)
        return
      }

      setJoined(true)
      setTimeout(() => {
        void navigate({ to: '/' })
      }, 2000)
    } catch {
      setError(m.invite_failedToJoin())
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
            {m.invite_teamInvitation()}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {m.invite_signInRequired()}
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/login">
              <Button className="w-full">{m.invite_signIn()}</Button>
            </Link>
            <Link to="/login">
              <Button className="w-full" variant="outline">
                {m.invite_createAccount()}
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
          {joined ? m.invite_welcomeToTeam() : m.invite_teamInvitation()}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {joined ? m.invite_redirecting() : m.invite_invitedToTeam()}
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
              {m.invite_acceptInvitation()}
            </Button>
            <Link
              className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
              to="/"
            >
              {m.invite_declineAndGoToDashboard()}
            </Link>
          </div>
        )}

        {error !== null && (
          <p className="text-destructive mt-4 text-sm font-medium">{error}</p>
        )}
      </div>
    </div>
  )
}
