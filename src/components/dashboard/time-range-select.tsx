import { useTranslation } from 'react-i18next'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'

const TIME_RANGES = [
  { key: 'today', value: '1' },
  { key: 'yesterday', value: '2' },
  { key: 'last7days', value: '7' },
  { key: 'last30days', value: '30' },
  { key: 'lastYear', value: '365' },
] as const

type TimeRangeSelectProps = {
  onChange: (value: string) => void
  value: string
}

export const TimeRangeSelect = ({ onChange, value }: TimeRangeSelectProps) => {
  const { t } = useTranslation()

  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_RANGES.map((range) => (
          <SelectItem key={range.value} value={range.value}>
            {t(`time.${range.key}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
