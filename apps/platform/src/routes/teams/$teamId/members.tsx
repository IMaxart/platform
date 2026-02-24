import { authClient, useSession } from '@platform/auth/client'
import { Avatar, AvatarFallback } from '@platform/ui/components/avatar'
import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui/components/table'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Check,
  Copy,
  Link2,
  Loader2,
  Mail,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useCallback, useState } from 'react'

import { Header } from '~/components/layout/header'
import { usePlatformRole } from '~/hooks/use-platform-role'

export const Route = createFileRoute('/teams/$teamId/members')({
  component: TeamMembersPage,
})

function InviteSection({ teamId }: { teamId: string }) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const [success, setSuccess] = useState(false)
  const [inviteLink, setInviteLink] = useState<null | string>(null)
  const [copied, setCopied] = useState(false)

  const handleInviteByEmail = useCallback(
    async (e: Event) => {
      e.preventDefault()
      setError(null)
      setSuccess(false)
      setLoading(true)

      try {
        const result = await authClient.organization.inviteMember({
          email,
          organizationId: teamId,
          role: role as 'admin' | 'member' | 'owner',
        })

        if (result.error) {
          setError(result.error.message ?? 'Failed to send invitation')
          setLoading(false)
          return
        }

        setSuccess(true)
        setEmail('')
      } catch {
        setError('Failed to send invitation')
      }
      setLoading(false)
    },
    [email, role, teamId],
  )

  const handleGenerateLink = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      const result = await authClient.organization.inviteMember({
        email: `invite+${Date.now()}@placeholder.local`,
        organizationId: teamId,
        role: role as 'admin' | 'member' | 'owner',
      })

      if (result.error) {
        setError(result.error.message ?? 'Failed to generate invite link')
        setLoading(false)
        return
      }

      const baseUrl = window.location.origin
      setInviteLink(`${baseUrl}/invite/${result.data?.id ?? ''}`)
    } catch {
      setError('Failed to generate invite link')
    }
    setLoading(false)
  }, [role, teamId])

  const copyLink = async () => {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite members
        </CardTitle>
        <CardDescription>
          Invite people by email or share an invite link
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="space-y-4" onSubmit={handleInviteByEmail}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                onChange={(e) => {
                  setEmail(e.target.value)
                }}
                placeholder="colleague@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select onValueChange={setRole} value={role}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button disabled={loading} type="submit">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Send invitation
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                void handleGenerateLink()
              }}
              type="button"
              variant="outline"
            >
              <Link2 className="mr-2 h-4 w-4" />
              Generate link
            </Button>
          </div>
        </form>

        {inviteLink && (
          <div className="flex items-center gap-2">
            <code className="bg-muted flex-1 truncate rounded-md px-3 py-2 text-sm">
              {inviteLink}
            </code>
            <Button
              onClick={() => {
                void copyLink()
              }}
              size="icon"
              variant="outline"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {success && (
          <p className="text-sm font-medium text-green-600">
            Invitation sent successfully
          </p>
        )}

        {error && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}

function PendingInvitations({ teamId }: { teamId: string }) {
  const invitationsQuery = useQuery({
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: teamId },
      })
      return result.data?.invitations ?? []
    },
    queryKey: ['invitations', teamId],
  })

  const pendingInvitations = invitationsQuery.data?.filter(
    (inv) => inv.status === 'pending',
  )

  if (!pendingInvitations || pendingInvitations.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending invitations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInvitations.map((inv) => (
            <div
              className="flex items-center justify-between rounded-lg border p-3"
              key={inv.id}
            >
              <div>
                <p className="text-sm font-medium">{inv.email}</p>
                <p className="text-muted-foreground text-xs">
                  <Badge className="mr-1" variant="outline">
                    {inv.role}
                  </Badge>
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                onClick={() => {
                  void authClient.organization.cancelInvitation({
                    invitationId: inv.id,
                  })
                  void invitationsQuery.refetch()
                }}
                size="icon"
                variant="ghost"
              >
                <Trash2 className="text-destructive h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function TeamMembersPage() {
  const { teamId } = Route.useParams()
  const { data: session } = useSession()
  const { isSuperAdmin } = usePlatformRole()

  const orgQuery = useQuery({
    queryFn: async () => {
      const result = await authClient.organization.getFullOrganization({
        query: { organizationId: teamId },
      })
      return result.data
    },
    queryKey: ['organization', teamId],
  })

  const org = orgQuery.data

  const currentMember = org?.members?.find(
    (m) => m.userId === session?.user?.id,
  )
  const orgRole = currentMember?.role ?? 'member'
  const canInvite = isSuperAdmin || orgRole === 'owner' || orgRole === 'admin'
  const canRemove = canInvite

  return (
    <>
      <Header title={org?.name ?? 'Team'} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              People who have access to this team&apos;s projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    {canRemove && <TableHead className="w-20" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {org?.members?.map((member) => {
                    const initials =
                      member.user.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) ?? '??'

                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {member.user.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {member.user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{member.role}</Badge>
                        </TableCell>
                        {canRemove && (
                          <TableCell>
                            {member.role !== 'owner' && (
                              <Button
                                onClick={() => {
                                  void authClient.organization.removeMember({
                                    memberIdOrEmail: member.id,
                                    organizationId: teamId,
                                  })
                                  void orgQuery.refetch()
                                }}
                                size="icon"
                                variant="ghost"
                              >
                                <Trash2 className="text-destructive h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    )
                  })}
                  {(!org?.members || org.members.length === 0) && (
                    <TableRow>
                      <TableCell
                        className="text-center"
                        colSpan={canRemove ? 3 : 2}
                      >
                        No members yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {canInvite && <InviteSection teamId={teamId} />}

        {canInvite && <PendingInvitations teamId={teamId} />}
      </div>
    </>
  )
}
