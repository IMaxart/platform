import { useSession } from '@platform/auth/client'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@platform/ui/components/tabs'
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import {
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  addServiceMember,
  cancelServiceInvitation,
  createServiceInvitation,
  getServiceInvitations,
  getServiceMembers,
  removeServiceMember,
  searchUsers,
  updateServiceMemberRole,
} from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const

const translateRole = (role: string) => {
  if (role === 'owner') return m.teamMembers_owner()
  if (role === 'admin') return m.teamMembers_admin()
  if (role === 'member') return m.teamMembers_member()
  if (role === 'viewer') return m.teamMembers_viewer()
  return role
}

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/members',
)({
  component: ServiceMembersPage,
})

type InviteByEmailFormProps = {
  onSuccess: () => void
  serviceId: string
}

type InviteSectionProps = {
  serviceId: string
}

type SearchAddFormProps = {
  onCancel: () => void
  onSuccess: () => void
  serviceId: string
}

function InviteByEmailForm({ onSuccess, serviceId }: InviteByEmailFormProps) {
  const { data: session } = useSession()
  const [error, setError] = useState<null | string>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      role: 'viewer' as string,
    },
    onSubmit: async ({ value }) => {
      setError(null)
      if (session?.user.id === undefined) return

      try {
        await createServiceInvitation({
          data: {
            email: value.email,
            inviterId: session.user.id,
            role: value.role,
            serviceId,
          },
        })
        onSuccess()
      } catch {
        setError(m.serviceInvite_failedToSend())
      }
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void form.handleSubmit()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invite-email">
                {m.teamMembers_emailAddress()}
              </Label>
              <Input
                id="invite-email"
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
                placeholder={m.placeholder_email()}
                required
                type="email"
                value={field.state.value}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="role">
          {(field) => (
            <div className="space-y-2">
              <Label>{m.serviceInvite_role()}</Label>
              <Select
                onValueChange={(value) => {
                  field.handleChange(value)
                }}
                value={field.state.value}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {translateRole(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>
      </div>

      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {m.serviceInvite_sendInvitation()}
          </Button>
        )}
      </form.Subscribe>

      {error !== null && (
        <p className="text-destructive text-sm font-medium">{error}</p>
      )}
    </form>
  )
}

function InviteSection({ serviceId }: InviteSectionProps) {
  const queryClient = useQueryClient()
  const [showSearch, setShowSearch] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const invitationsQuery = useQuery({
    queryFn: () => getServiceInvitations({ data: serviceId }),
    queryKey: ['service-invitations', serviceId],
  })

  const handleInviteSuccess = () => {
    setInviteSuccess(true)
    void queryClient.invalidateQueries({
      queryKey: ['service-invitations', serviceId],
    })
    setTimeout(() => {
      setInviteSuccess(false)
    }, 3000)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {m.serviceInvite_inviteMembers()}
          </CardTitle>
          <CardDescription>
            {m.serviceInvite_inviteDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="email">
            <TabsList>
              <TabsTrigger value="email">
                {m.serviceInvite_byEmail()}
              </TabsTrigger>
              <TabsTrigger value="search">
                {m.serviceInvite_existingUser()}
              </TabsTrigger>
            </TabsList>
            <TabsContent className="mt-4" value="email">
              <InviteByEmailForm
                onSuccess={handleInviteSuccess}
                serviceId={serviceId}
              />
            </TabsContent>
            <TabsContent className="mt-4" value="search">
              {showSearch ? (
                <SearchAddForm
                  onCancel={() => {
                    setShowSearch(false)
                  }}
                  onSuccess={() => {
                    setShowSearch(false)
                    void queryClient.invalidateQueries({
                      queryKey: ['service-members', serviceId],
                    })
                  }}
                  serviceId={serviceId}
                />
              ) : (
                <Button
                  onClick={() => {
                    setShowSearch(true)
                  }}
                  variant="outline"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {m.serviceInvite_searchByEmail()}
                </Button>
              )}
            </TabsContent>
          </Tabs>

          {inviteSuccess && (
            <p className="text-sm font-medium text-green-600">
              {m.serviceInvite_invitationSent()}
            </p>
          )}
        </CardContent>
      </Card>

      {invitationsQuery.data && invitationsQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{m.serviceInvite_pendingInvitations()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitationsQuery.data.map((inv) => (
                <div
                  className="flex items-center justify-between rounded-lg border p-3"
                  key={inv.id}
                >
                  <div>
                    <p className="text-sm font-medium">{inv.email}</p>
                    <p className="text-muted-foreground text-xs">
                      <Badge className="mr-1" variant="outline">
                        {translateRole(inv.role)}
                      </Badge>
                      {m.teamMembers_expires()}{' '}
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      void cancelServiceInvitation({
                        data: { invitationId: inv.id },
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
      )}
    </>
  )
}

function SearchAddForm({ onCancel, onSuccess, serviceId }: SearchAddFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<null | {
    email: string
    id: string
    name: string
  }>(null)

  const usersQuery = useQuery({
    enabled: searchQuery.length >= 2,
    queryFn: () => searchUsers({ data: { query: searchQuery } }),
    queryKey: ['search-users', searchQuery],
  })

  const form = useForm({
    defaultValues: {
      role: 'viewer' as string,
    },
    onSubmit: async ({ value }) => {
      if (!selectedUser) return
      await addServiceMember({
        data: {
          role: value.role,
          serviceId,
          userId: selectedUser.id,
        },
      })
      onSuccess()
    },
  })

  return (
    <div className="space-y-3">
      {!selectedUser ? (
        <>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              onChange={(e) => {
                setSearchQuery(e.target.value)
              }}
              placeholder={m.serviceInvite_searchByEmail()}
              value={searchQuery}
            />
          </div>
          {usersQuery.data && usersQuery.data.length > 0 && (
            <div className="space-y-1 rounded-md border p-2">
              {usersQuery.data.map((user) => (
                <button
                  className="hover:bg-accent flex w-full items-center gap-3 rounded-md p-2 text-left text-sm transition-colors"
                  key={user.id}
                  onClick={() => {
                    setSelectedUser(user)
                  }}
                  type="button"
                >
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={onCancel} type="button" variant="ghost">
              {m.common_cancel()}
            </Button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="mb-4 flex items-center gap-3 rounded-md border p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedUser.name}</p>
              <p className="text-muted-foreground text-xs">
                {selectedUser.email}
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedUser(null)
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              {m.common_change()}
            </Button>
          </div>

          <form.Field name="role">
            {(field) => (
              <div className="mb-4 space-y-2">
                <Label>{m.serviceInvite_role()}</Label>
                <Select
                  onValueChange={(value) => {
                    field.handleChange(value)
                  }}
                  value={field.state.value}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {translateRole(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>

          <div className="flex gap-2">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {m.serviceInvite_addMember()}
                </Button>
              )}
            </form.Subscribe>
            <Button onClick={onCancel} type="button" variant="ghost">
              {m.common_cancel()}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

function ServiceMembersPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/members',
  })
  const queryClient = useQueryClient()

  const membersQuery = useQuery({
    queryFn: () => getServiceMembers({ data: serviceId }),
    queryKey: ['service-members', serviceId],
  })

  const handleRemove = async (memberId: string) => {
    await removeServiceMember({ data: { memberId } })
    void queryClient.invalidateQueries({
      queryKey: ['service-members', serviceId],
    })
  }

  const handleRoleChange = async (memberId: string, role: string) => {
    await updateServiceMemberRole({ data: { memberId, role } })
    void queryClient.invalidateQueries({
      queryKey: ['service-members', serviceId],
    })
  }

  return (
    <>
      <Header title={m.serviceMembers_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>{m.serviceMembers_members()}</CardTitle>
            <CardDescription>{m.serviceMembers_description()}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {membersQuery.data?.map((member) => (
                <div
                  className="flex items-center justify-between px-5 py-3"
                  key={member.id}
                >
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {member.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(value) => {
                        void handleRoleChange(member.id, value)
                      }}
                      value={member.role}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {translateRole(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {member.role !== 'owner' && (
                      <Button
                        onClick={() => {
                          void handleRemove(member.id)
                        }}
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {membersQuery.data?.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="text-muted-foreground mb-4 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">
                    {m.serviceMembers_noMembersYet()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <InviteSection serviceId={serviceId} />
      </div>
    </>
  )
}
