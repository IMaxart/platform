import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import { useTranslation } from 'react-i18next'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type ChartData = {
  date: string
  sessionCount: number
  visitors: number
}

export const VisitorsChart = ({ data }: { data: ChartData[] }) => {
  const { t } = useTranslation()

  return (
    <Card className="transition-all duration-300 ease-out">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">
          {t('overview.visitors')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-6">
        <div className="h-[320px]">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={data}
              margin={{ bottom: 0, left: -8, right: 8, top: 4 }}
            >
              <defs>
                <linearGradient id="visitors" x1="0" x2="0" y1="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-primary)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                className="stroke-border/50"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis
                axisLine={false}
                className="text-xs"
                dataKey="date"
                dy={8}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })
                }
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                className="text-xs"
                dx={-4}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backdropFilter: 'blur(8px)',
                  backgroundColor: 'var(--color-popover)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: '0 4px 12px rgb(0 0 0 / 0.08)',
                  color: 'var(--color-popover-foreground)',
                  fontSize: '13px',
                }}
                cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }}
              />
              <Area
                dataKey="visitors"
                fill="url(#visitors)"
                stroke="var(--color-primary)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
