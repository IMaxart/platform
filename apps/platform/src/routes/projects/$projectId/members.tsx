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
import { useForm } from '@tanstack/react-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { Loader2, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import {
  addProjectMember,
  getProjectMembers,
  removeProjectMember,
  searchUsers,
  updateProjectMemberRole,
} from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/projects/$projectId/members')({
  component: ProjectMembersPage,
})

const ROLES = ['owner', 'admin', 'member', 'viewer'] as const

type AddMemberFormProps = {
  onCancel: () => void
  onSuccess: () => void
  projectId: string
}

function AddMemberForm({ onCancel, onSuccess, projectId }: AddMemberFormProps) {
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
      await addProjectMember({
        data: {
          projectId,
          role: value.role,
          userId: selectedUser.id,
        },
      })
      onSuccess()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.projectMembers_addMember()}</CardTitle>
        <CardDescription>
          {m.projectMembers_addMemberDescription()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!selectedUser ? (
          <div className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                className="pl-9"
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                }}
                placeholder={m.projectMembers_searchByEmail()}
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
          </div>
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
                  <Label>{m.projectMembers_role()}</Label>
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
                          {role}
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
                    {m.projectMembers_addMember()}
                  </Button>
                )}
              </form.Subscribe>
              <Button onClick={onCancel} type="button" variant="ghost">
                {m.common_cancel()}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

function ProjectMembersPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/members' })
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)

  const membersQuery = useQuery({
    queryFn: () => getProjectMembers({ data: projectId }),
    queryKey: ['project-members', projectId],
  })

  const handleRemove = async (memberId: string) => {
    await removeProjectMember({ data: { memberId } })
    void queryClient.invalidateQueries({
      queryKey: ['project-members', projectId],
    })
  }

  const handleRoleChange = async (memberId: string, role: string) => {
    await updateProjectMemberRole({ data: { memberId, role } })
    void queryClient.invalidateQueries({
      queryKey: ['project-members', projectId],
    })
  }

  return (
    <>
      <Header title={m.projectMembers_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {m.projectMembers_members()}
            </h2>
            <p className="text-muted-foreground text-sm">
              {m.projectMembers_description()}
            </p>
          </div>
          <Button
            onClick={() => {
              setShowAdd(true)
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {m.projectMembers_addMember()}
          </Button>
        </div>

        {showAdd && (
          <AddMemberForm
            onCancel={() => {
              setShowAdd(false)
            }}
            onSuccess={() => {
              setShowAdd(false)
              void membersQuery.refetch()
            }}
            projectId={projectId}
          />
        )}

        <Card>
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
                            {role}
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
                    {m.projectMembers_noMembersYet()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
