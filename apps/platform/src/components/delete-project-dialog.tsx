import { Button } from '@platform/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@platform/ui/components/dialog'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Clipboard, Loader2 } from 'lucide-react'
import { useState } from 'react'

import {
  deleteProject,
  getProjectDeletionInfo,
} from '~/lib/server/project-queries'
import * as m from '~/paraglide/messages'

type DeleteProjectDialogProps = {
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  open: boolean
  projectId: string
}

export const DeleteProjectDialog = ({
  onOpenChange,
  onSuccess,
  open,
  projectId,
}: DeleteProjectDialogProps) => {
  const [copied, setCopied] = useState(false)

  const { data: project } = useQuery({
    enabled: open,
    queryFn: () => getProjectDeletionInfo({ data: projectId }),
    queryKey: ['project-deletion-info', projectId],
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProject({ data: { projectId } }),
    onSuccess,
  })

  const projectName = project?.name ?? ''
  const serviceNames = project?.services.map((s) => s.name) ?? []
  const memberCount = project?.members.length ?? 0
  const hasServices = serviceNames.length > 0
  const hasMembers = memberCount > 0

  const form = useForm({
    defaultValues: { confirmName: '' },
    onSubmit: async () => {
      await deleteMutation.mutateAsync()
    },
  })

  const handleCopy = async () => {
    await navigator.clipboard.writeText(projectName)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset()
      setCopied(false)
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {m.deleteProject_title()}
          </DialogTitle>
          <DialogDescription>{m.deleteProject_description()}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="bg-destructive/10 border-destructive/20 space-y-2 rounded-md border p-3 text-sm">
            <p className="text-destructive font-medium">
              {m.deleteProject_irreversible()}
            </p>

            {hasServices && (
              <p>
                {m.deleteProject_servicesWarning({
                  services: serviceNames.join(', '),
                })}
              </p>
            )}

            {hasMembers && (
              <p>
                {m.deleteProject_membersWarning({
                  count: String(memberCount),
                })}
              </p>
            )}

            {hasServices && <p>{m.deleteProject_analyticsWarning()}</p>}
          </div>

          <div className="space-y-2">
            <Label>{m.deleteProject_confirmLabel()}</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-sm">
                {projectName}
              </code>
              <Button
                className="shrink-0"
                onClick={() => {
                  void handleCopy()
                }}
                size="sm"
                type="button"
                variant="outline"
              >
                {copied ? (
                  <>
                    <Check className="mr-1 h-3 w-3" />
                    {m.deleteProject_copied()}
                  </>
                ) : (
                  <>
                    <Clipboard className="mr-1 h-3 w-3" />
                    {m.deleteProject_copyName()}
                  </>
                )}
              </Button>
            </div>
            <form.Field name="confirmName">
              {(field) => (
                <Input
                  onChange={(e) => {
                    field.handleChange(e.target.value)
                  }}
                  placeholder={m.deleteProject_inputPlaceholder()}
                  value={field.state.value}
                />
              )}
            </form.Field>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                handleOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {m.common_cancel()}
            </Button>
            <form.Subscribe
              selector={(s) => ({
                confirmName: s.values.confirmName,
              })}
            >
              {({ confirmName }) => {
                const isConfirmed =
                  confirmName === projectName && projectName.length > 0

                return (
                  <Button
                    disabled={!isConfirmed || deleteMutation.isPending}
                    type="submit"
                    variant="destructive"
                  >
                    {deleteMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {m.deleteProject_deleteButton()}
                  </Button>
                )
              }}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
