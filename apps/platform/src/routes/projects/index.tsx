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
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRight, FolderOpen, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import { createProject, getProjects } from '~/lib/server/queries'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

type CreateProjectFormProps = {
  onCancel: () => void
  onSuccess: () => void
  teamId: string
}

function CreateProjectForm({
  onCancel,
  onSuccess,
  teamId,
}: CreateProjectFormProps) {
  const form = useForm({
    defaultValues: {
      name: '',
    },
    onSubmit: async ({ value }) => {
      await createProject({
        data: {
          name: value.name,
          teamId,
        },
      })
      onSuccess()
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new project</CardTitle>
        <CardDescription>
          Projects group services like frontend, API, mobile app, etc.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <form.Field name="name">
            {(field) => (
              <div className="space-y-2">
                <Label htmlFor="project-name">Project name</Label>
                <Input
                  id="project-name"
                  onBlur={field.handleBlur}
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder="ministry-life"
                  required
                  value={field.state.value}
                />
              </div>
            )}
          </form.Field>

          <div className="mt-4 flex gap-2">
            <form.Subscribe selector={(s) => s.isSubmitting}>
              {(isSubmitting) => (
                <Button disabled={isSubmitting} type="submit">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Create project
                </Button>
              )}
            </form.Subscribe>
            <Button onClick={onCancel} type="button" variant="ghost">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ProjectsPage() {
  const { data: activeOrg } = authClient.useActiveOrganization()
  const [showCreate, setShowCreate] = useState(false)

  const projectsQuery = useQuery({
    enabled: activeOrg?.id !== undefined,
    queryFn: () =>
      getProjects({
        data:
          activeOrg?.id !== undefined ? { teamId: activeOrg.id } : undefined,
      }),
    queryKey: ['projects', activeOrg?.id],
  })

  return (
    <>
      <Header title="Projects" />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {activeOrg ? `${activeOrg.name} Projects` : 'Projects'}
            </h2>
            <p className="text-muted-foreground text-sm">
              Manage projects, analytics, and services
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreate(true)
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Button>
        </div>

        {showCreate && activeOrg && (
          <CreateProjectForm
            onCancel={() => {
              setShowCreate(false)
            }}
            onSuccess={() => {
              setShowCreate(false)
              void projectsQuery.refetch()
            }}
            teamId={activeOrg.id}
          />
        )}

        {!activeOrg && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="text-muted-foreground mb-4 h-10 w-10" />
              <p className="text-muted-foreground mb-4 text-sm">
                Select a team to view projects
              </p>
              <Link to="/teams">
                <Button variant="outline">Go to teams</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsQuery.data?.map((project) => (
            <Link
              key={project.id}
              params={{ projectId: project.id }}
              to="/projects/$projectId"
            >
              <Card className="cursor-pointer transition-all duration-200 hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                      <FolderOpen className="h-5 w-5" />
                    </div>
                    <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0" />
                  </div>
                  <p className="mb-1 truncate font-medium">{project.name}</p>
                  <p className="text-muted-foreground text-xs">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {activeOrg && projectsQuery.data?.length === 0 && !showCreate && (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FolderOpen className="text-muted-foreground mb-4 h-10 w-10" />
                <p className="text-muted-foreground mb-4 text-sm">
                  No projects yet in this team
                </p>
                <Button
                  onClick={() => {
                    setShowCreate(true)
                  }}
                  variant="outline"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first project
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
