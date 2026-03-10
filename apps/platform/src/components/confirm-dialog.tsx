import { Button } from '@platform/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@platform/ui/components/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'

import * as m from '~/paraglide/messages'

type ConfirmDialogProps = {
  confirmLabel?: string
  description: string
  loading?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
  variant?: 'default' | 'destructive'
}

export const ConfirmDialog = ({
  confirmLabel,
  description,
  loading = false,
  onConfirm,
  onOpenChange,
  open,
  title,
  variant = 'destructive',
}: ConfirmDialogProps) => {
  const isDestructive = variant === 'destructive'

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle
            className={
              isDestructive ? 'text-destructive flex items-center gap-2' : ''
            }
          >
            {isDestructive && <AlertTriangle className="h-5 w-5" />}
            {title}
          </DialogTitle>
          <DialogDescription className="whitespace-pre-line">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false)
            }}
            type="button"
            variant="outline"
          >
            {m.common_cancel()}
          </Button>
          <Button
            disabled={loading}
            onClick={onConfirm}
            variant={isDestructive ? 'destructive' : 'default'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel ?? m.confirm_proceed()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
