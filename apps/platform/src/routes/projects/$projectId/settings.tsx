import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

import { DeleteProjectDialog } from '~/components/delete-project-dialog'
import { Header } from '~/components/layout/header'
import { deleteProject } from '~/lib/server/project-queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/projects/$projectId/settings')({
  component: ProjectSettingsPage,
})

function ProjectSettingsPage() {
  const { projectId } = useParams({ from: '/projects/$projectId/settings' })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const handleDelete = async () => {
    await deleteProject({ data: { projectId } })
    void queryClient.invalidateQueries({ queryKey: ['projects'] })
    await navigate({ to: '/projects' })
  }

  return (
    <>
      <Header title={m.projectSettings_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              {m.deleteProject_dangerZone()}
            </CardTitle>
            <CardDescription>
              {m.deleteProject_dangerZoneDescription()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setDeleteOpen(true)
              }}
              variant="destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {m.deleteProject_deleteButton()}
            </Button>
          </CardContent>
        </Card>
      </div>

      <DeleteProjectDialog
        onConfirm={handleDelete}
        onOpenChange={setDeleteOpen}
        open={deleteOpen}
        projectId={projectId}
      />
    </>
  )
}
