import { Badge } from '@platform/ui/components/badge'

import * as m from '~/paraglide/messages'
import type { CheckState } from '~/server/types'

const getBadgeVariant = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return 'success'
  if (state === 'DEGRADED') return 'warning'
  if (state === 'DOWN') return 'danger'
  return 'secondary'
}

const getLabel = ({ state }: { state: CheckState }) => {
  if (state === 'UP') return m.state_operational()
  if (state === 'DEGRADED') return m.state_degraded()
  if (state === 'DOWN') return m.state_down()
  return m.state_unknown()
}

export const StatusBadge = ({ state }: { state: CheckState }) => {
  return (
    <Badge variant={getBadgeVariant({ state })}>{getLabel({ state })}</Badge>
  )
}
