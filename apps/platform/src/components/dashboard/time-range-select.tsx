import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@platform/ui/components/select'

import * as m from '~/paraglide/messages'

const TIME_RANGES = [
  { key: 'today', value: '1' },
  { key: 'yesterday', value: '2' },
  { key: 'last7days', value: '7' },
  { key: 'last30days', value: '30' },
  { key: 'lastYear', value: '365' },
] as const

type TimeRangeKey = (typeof TIME_RANGES)[number]['key']

const TIME_RANGE_LABELS: Record<TimeRangeKey, () => string> = {
  last7days: () => m.time_last7days(),
  last30days: () => m.time_last30days(),
  lastYear: () => m.time_lastYear(),
  today: () => m.time_today(),
  yesterday: () => m.time_yesterday(),
}

type TimeRangeSelectProps = {
  onChange: (value: string) => void
  value: string
}

export const TimeRangeSelect = ({ onChange, value }: TimeRangeSelectProps) => {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGES.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {TIME_RANGE_LABELS[range.key]()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
