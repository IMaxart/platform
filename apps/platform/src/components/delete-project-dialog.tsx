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
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, Clipboard, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { getProjectDeletionInfo } from '~/lib/server/project-queries'
import * as m from '~/paraglide/messages'

type DeleteProjectDialogProps = {
  onConfirm: () => Promise<void>
  onOpenChange: (open: boolean) => void
  open: boolean
  projectId: string
}

export const DeleteProjectDialog = ({
  onConfirm,
  onOpenChange,
  open,
  projectId,
}: DeleteProjectDialogProps) => {
  const [confirmValue, setConfirmValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const { data: project } = useQuery({
    enabled: open,
    queryFn: () => getProjectDeletionInfo({ data: projectId }),
    queryKey: ['project-deletion-info', projectId],
  })

  const projectName = project?.name ?? ''
  const serviceNames = project?.services.map((s) => s.name) ?? []
  const memberCount = project?.members.length ?? 0
  const hasServices = serviceNames.length > 0
  const hasMembers = memberCount > 0
  const isConfirmed = confirmValue === projectName && projectName.length > 0

  const handleCopy = async () => {
    await navigator.clipboard.writeText(projectName)
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  const handleDelete = async () => {
    if (!isConfirmed) return
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmValue('')
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

        <div className="space-y-3">
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
            <Input
              onChange={(e) => {
                setConfirmValue(e.target.value)
              }}
              placeholder={m.deleteProject_inputPlaceholder()}
              value={confirmValue}
            />
          </div>
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
          <Button
            disabled={!isConfirmed || isDeleting}
            onClick={() => {
              void handleDelete()
            }}
            type="button"
            variant="destructive"
          >
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {m.deleteProject_deleteButton()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
