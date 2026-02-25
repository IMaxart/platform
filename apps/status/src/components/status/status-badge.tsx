import { Badge } from '@platform/ui/components/badge'

import type { CheckState } from '~/server/types'

const getBadgeVariant = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return 'success'
  if (state === 'DEGRADED') return 'warning'
  if (state === 'DOWN') return 'danger'
  return 'secondary'
}

const getLabel = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return 'Up'
  if (state === 'DEGRADED') return 'Degraded'
  if (state === 'DOWN') return 'Down'
  return 'Unknown'
}

export const StatusBadge = ({ state }: { state: CheckState }) => {
  return (
    <Badge variant={getBadgeVariant({ state })}>{getLabel({ state })}</Badge>
  )
}
