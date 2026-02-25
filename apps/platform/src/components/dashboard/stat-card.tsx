import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'

type StatCardProps = {
  description?: string
  icon?: ReactNode
  title: string
  trend?: { direction: 'down' | 'neutral' | 'up'; label: string }
  value: number | string
}

export const StatCard = ({
  description,
  icon,
  title,
  trend,
  value,
}: StatCardProps) => (
  <Card className="transition-all duration-300 ease-out hover:shadow-md">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-muted-foreground text-sm font-medium">
        {title}
      </CardTitle>
      {icon !== undefined && icon !== null ? (
        <div className="text-muted-foreground/60">{icon}</div>
      ) : null}
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-semibold tracking-tight">{value}</div>
      {trend ? (
        <p
          className={`mt-1 text-xs font-medium ${
            trend.direction === 'up'
              ? 'text-emerald-600 dark:text-emerald-400'
              : trend.direction === 'down'
                ? 'text-red-500 dark:text-red-400'
                : 'text-muted-foreground'
          }`}
        >
          {trend.direction === 'up'
            ? '\u2191'
            : trend.direction === 'down'
              ? '\u2193'
              : ''}{' '}
          {trend.label}
        </p>
      ) : null}
      {description !== undefined ? (
        <p className="text-muted-foreground mt-1 text-xs">{description}</p>
      ) : null}
    </CardContent>
  </Card>
)
