import { authClient } from '@platform/auth/client'
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
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Building2, ChevronRight, Loader2, Plus, Users } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import { usePlatformRole } from '~/hooks/use-platform-role'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/teams/')({
  component: TeamsPage,
})

const slugFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

function TeamsPage() {
  const { data: orgs, refetch } = authClient.useListOrganizations()
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<null | string>(null)
  const { isSuperAdmin } = usePlatformRole()
  const navigate = useNavigate()

  const form = useForm({
    defaultValues: { name: '', slug: '' },
    onSubmit: async ({ value }) => {
      setError(null)

      try {
        const autoSlug = value.slug || slugFromName(value.name)

        const result = await authClient.organization.create({
          name: value.name,
          slug: autoSlug,
        })

        if (result.error) {
          setError(result.error.message ?? m.teams_failedToCreate())
          return
        }

        await authClient.organization.setActive({
          organizationId: result.data.id,
        })

        form.reset()
        setShowCreate(false)
        void refetch()
        await navigate({ to: '/projects' })
      } catch {
        setError(m.common_unexpectedError())
      }
    },
  })

  return (
    <>
      <Header title={m.teams_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{m.teams_yourTeams()}</h2>
            <p className="text-muted-foreground text-sm">
              {m.teams_description()}
            </p>
          </div>
          {isSuperAdmin && (
            <Button
              onClick={() => {
                setShowCreate(true)
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {m.teams_createTeam()}
            </Button>
          )}
        </div>

        {showCreate && isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>{m.teams_createNewTeam()}</CardTitle>
              <CardDescription>{m.teams_createDescription()}</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  void form.handleSubmit()
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="name">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="team-name">{m.teams_teamName()}</Label>
                        <Input
                          id="team-name"
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value)
                          }}
                          placeholder="My Team"
                          required
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field name="slug">
                    {(field) => (
                      <div className="space-y-2">
                        <Label htmlFor="team-slug">
                          {m.teams_slug()}{' '}
                          <span className="text-muted-foreground">
                            ({m.common_optional()})
                          </span>
                        </Label>
                        <Input
                          id="team-slug"
                          onBlur={field.handleBlur}
                          onChange={(e) => {
                            field.handleChange(e.target.value)
                          }}
                          placeholder="my-team"
                          value={field.state.value}
                        />
                      </div>
                    )}
                  </form.Field>
                </div>

                {error !== null ? (
                  <p className="text-destructive text-sm font-medium">
                    {error}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <form.Subscribe selector={(s) => s.isSubmitting}>
                    {(isSubmitting) => (
                      <Button disabled={isSubmitting} type="submit">
                        {isSubmitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        {m.common_create()}
                      </Button>
                    )}
                  </form.Subscribe>
                  <Button
                    onClick={() => {
                      setShowCreate(false)
                    }}
                    type="button"
                    variant="ghost"
                  >
                    {m.common_cancel()}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {orgs?.map((org) => (
            <Link
              key={org.id}
              params={{ teamId: org.id }}
              to="/teams/$teamId/members"
            >
              <Card className="cursor-pointer transition-all duration-200 hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{org.name}</p>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5" />
                      {org.slug}
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}

          {(!orgs || orgs.length === 0) && !showCreate && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="text-muted-foreground mb-4 h-10 w-10" />
                <p className="text-muted-foreground mb-4 text-sm">
                  {isSuperAdmin
                    ? m.teams_noTeamsYet()
                    : m.teams_noTeamsContactAdmin()}
                </p>
                {isSuperAdmin && (
                  <Button
                    onClick={() => {
                      setShowCreate(true)
                    }}
                    variant="outline"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {m.teams_createFirstTeam()}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
