import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui/components/select'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarArrowDown,
  CalendarArrowUp,
} from 'lucide-react'

import * as m from '~/paraglide/messages'

const SORT_OPTIONS = [
  { icon: ArrowDownAZ, key: 'name-asc' },
  { icon: ArrowUpAZ, key: 'name-desc' },
  { icon: CalendarArrowDown, key: 'newest' },
  { icon: CalendarArrowUp, key: 'oldest' },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']

const SORT_LABELS: Record<SortKey, () => string> = {
  'name-asc': () => m.sort_nameAsc(),
  'name-desc': () => m.sort_nameDesc(),
  newest: () => m.sort_newestFirst(),
  oldest: () => m.sort_oldestFirst(),
}

type SortSelectProps = {
  onChange: (value: SortKey) => void
  value: SortKey
}

export type { SortKey }

export const SortSelect = ({ onChange, value }: SortSelectProps) => (
  <Select
    onValueChange={(v) => {
      onChange(v as SortKey)
    }}
    value={value}
  >
    <SelectTrigger className="w-[180px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      {SORT_OPTIONS.map((option) => {
        const Icon = option.icon
        return (
          <SelectItem key={option.key} value={option.key}>
            <span className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" />
              {SORT_LABELS[option.key]()}
            </span>
          </SelectItem>
        )
      })}
    </SelectContent>
  </Select>
)

export const sortByName = <T extends { name: string }>(
  items: T[],
  direction: 'asc' | 'desc',
): T[] =>
  [...items].sort((a, b) =>
    direction === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name),
  )

export const sortByDate = <T extends { createdAt: Date | string }>(
  items: T[],
  direction: 'asc' | 'desc',
): T[] =>
  [...items].sort((a, b) => {
    const da = new Date(a.createdAt).getTime()
    const db = new Date(b.createdAt).getTime()
    return direction === 'asc' ? da - db : db - da
  })

export const applySortKey = <
  T extends { createdAt: Date | string; name: string },
>(
  items: T[],
  key: SortKey,
): T[] => {
  switch (key) {
    case 'name-asc':
      return sortByName(items, 'asc')
    case 'name-desc':
      return sortByName(items, 'desc')
    case 'newest':
      return sortByDate(items, 'desc')
    case 'oldest':
      return sortByDate(items, 'asc')
  }
}
