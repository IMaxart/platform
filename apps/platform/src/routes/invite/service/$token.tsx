import { useSession } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, Server } from 'lucide-react'
import { useCallback, useState } from 'react'

import {
  acceptServiceInvitation,
  getServiceInvitationById,
} from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/invite/service/$token')({
  component: ServiceInvitePage,
})

function ServiceInvitePage() {
  const { token } = useParams({ from: '/invite/service/$token' })
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [joined, setJoined] = useState(false)

  const invitationQuery = useQuery({
    queryFn: () => getServiceInvitationById({ data: token }),
    queryKey: ['service-invitation', token],
  })

  const serviceName = invitationQuery.data?.service?.name

  const handleAccept = useCallback(async () => {
    if (!session?.user.id) return
    setError(null)
    setLoading(true)

    try {
      const result = await acceptServiceInvitation({
        data: { invitationId: token, userId: session.user.id },
      })

      if ('error' in result && result.error) {
        setError(result.error)
        setLoading(false)
        return
      }

      setJoined(true)
      setTimeout(() => {
        void navigate({ to: '/' })
      }, 2000)
    } catch {
      setError(m.serviceInvite_failedToJoin())
      setLoading(false)
    }
  }, [token, session, navigate])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <Server className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.serviceInvite_title()}
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
            <Server className="text-background h-5 w-5" />
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {joined
            ? m.serviceInvite_welcomeToService()
            : m.serviceInvite_title()}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {joined
            ? m.invite_redirecting()
            : m.serviceInvite_invitedToService({ name: serviceName ?? '' })}
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
