import { useSession } from '@platform/auth/client'
import { Button } from '@platform/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from '@tanstack/react-router'
import { Check, FolderKanban, Loader2 } from 'lucide-react'
import { useCallback, useState } from 'react'

import {
  acceptProjectInvitation,
  getProjectInvitationById,
} from '~/lib/server/project-queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/invite/project/$token')({
  component: ProjectInvitePage,
})

function ProjectInvitePage() {
  const { token } = useParams({ from: '/invite/project/$token' })
  const navigate = useNavigate()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [joined, setJoined] = useState(false)

  const invitationQuery = useQuery({
    queryFn: () => getProjectInvitationById({ data: token }),
    queryKey: ['project-invitation', token],
  })

  const projectName = invitationQuery.data?.project?.name ?? ''

  const handleAccept = useCallback(async () => {
    if (session?.user.id === undefined) return
    setError(null)
    setLoading(true)

    try {
      const result = await acceptProjectInvitation({
        data: { invitationId: token, userId: session.user.id },
      })

      if ('error' in result && typeof result.error === 'string') {
        setError(result.error)
        setLoading(false)
        return
      }

      setJoined(true)
      setTimeout(() => {
        if ('projectId' in result && typeof result.projectId === 'string') {
          void navigate({
            params: { projectId: result.projectId },
            to: '/projects/$projectId/members',
          })
        } else {
          void navigate({ to: '/' })
        }
      }, 2000)
    } catch {
      setError(m.projectInvite_failedToJoin())
      setLoading(false)
    }
  }, [token, session, navigate])

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-foreground mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-xl">
            <FolderKanban className="text-background h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {m.projectInvite_title()}
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
            <FolderKanban className="text-background h-5 w-5" />
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {joined
            ? m.projectInvite_welcomeToProject()
            : m.projectInvite_title()}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {joined
            ? m.invite_redirecting()
            : m.projectInvite_invitedToProject({ name: projectName })}
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
