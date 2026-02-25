import type { FeatureFlagConditions } from '@platform/db/schema'
import { Badge } from '@platform/ui/components/badge'
import { Button } from '@platform/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@platform/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@platform/ui/components/dialog'
import { Input } from '@platform/ui/components/input'
import { Label } from '@platform/ui/components/label'
import { Switch } from '@platform/ui/components/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@platform/ui/components/table'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { Flag, Loader2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import { getFeatureFlags } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute(
  '/projects/$projectId/services/$serviceId/flags',
)({
  component: FeatureFlagsPage,
})

function FeatureFlagsPage() {
  const { serviceId } = useParams({
    from: '/projects/$projectId/services/$serviceId/flags',
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const flagsQuery = useQuery({
    queryFn: () => getFeatureFlags({ data: serviceId }),
    queryKey: ['feature-flags', serviceId],
  })

  const renderConditions = (conditions: FeatureFlagConditions | null) => {
    if (!conditions) return '—'

    const parts: string[] = []
    if (conditions.percentage !== undefined) {
      parts.push(
        `${conditions.percentage}% ${m.flags_percentage().toLowerCase()}`,
      )
    }
    if (conditions.countries !== undefined && conditions.countries.length > 0) {
      parts.push(`${m.flags_countries()}: ${conditions.countries.join(', ')}`)
    }
    if (
      conditions.deviceTypes !== undefined &&
      conditions.deviceTypes.length > 0
    ) {
      parts.push(
        `${m.flags_deviceTypes()}: ${conditions.deviceTypes.join(', ')}`,
      )
    }

    return parts.length > 0 ? parts.join(' | ') : '—'
  }

  return (
    <>
      <Header title={m.flags_title()} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {m.flags_createFlag()}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{m.flags_createFlag()}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{m.flags_key()}</Label>
                  <Input placeholder={m.placeholder_flagKey()} />
                </div>
                <div className="space-y-2">
                  <Label>{m.flags_description()}</Label>
                  <Input placeholder={m.placeholder_flagDescription()} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch />
                  <Label>{m.flags_enabled()}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{m.flags_percentage()}</Label>
                  <Input max="100" min="0" placeholder="100" type="number" />
                </div>
                <Button className="w-full">{m.common_create()}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {m.flags_title()}
            </CardTitle>
            <CardDescription>{m.flags_manageDescription()}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.flags_key()}</TableHead>
                    <TableHead>{m.flags_description()}</TableHead>
                    <TableHead>{m.flags_status()}</TableHead>
                    <TableHead>{m.flags_conditions()}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagsQuery.isLoading ? (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={5}>
                        <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
                      </TableCell>
                    </TableRow>
                  ) : flagsQuery.data && flagsQuery.data.length > 0 ? (
                    flagsQuery.data.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell className="font-mono text-sm">
                          {flag.key}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {flag.description ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={flag.enabled ? 'default' : 'secondary'}
                          >
                            {flag.enabled
                              ? m.flags_enabled()
                              : m.flags_disabled()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {renderConditions(flag.conditions)}
                        </TableCell>
                        <TableCell>
                          <Switch checked={flag.enabled} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="py-12 text-center" colSpan={5}>
                        <Flag className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                        <p className="text-muted-foreground text-sm">
                          {m.common_noData()}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {m.flags_createFirstFlag()}
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
