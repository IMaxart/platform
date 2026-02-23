import type { ReactNode } from 'react'

import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  description?: string
  icon?: ReactNode
  title: string
}

export const EmptyState = ({ description, icon, title }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="bg-muted mb-4 rounded-full p-4">
      {icon ?? <Inbox className="text-muted-foreground h-8 w-8" />}
    </div>
    <h3 className="text-foreground mb-1 text-sm font-medium">{title}</h3>
    {description ? (
      <p className="text-muted-foreground max-w-xs text-sm">{description}</p>
    ) : null}
  </div>
)
