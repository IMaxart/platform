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
import { createFileRoute } from '@tanstack/react-router'
import { Flag, Plus } from 'lucide-react'
import { useState } from 'react'

import { Header } from '~/components/layout/header'
import { getFeatureFlags } from '~/lib/server/queries'
import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/feature-flags')({
  component: FeatureFlagsPage,
})

const DEMO_SERVICE_ID = '00000000-0000-0000-0000-000000000000'

function FeatureFlagsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const flagsQuery = useQuery({
    enabled: false,
    queryFn: () => getFeatureFlags({ data: DEMO_SERVICE_ID }),
    queryKey: ['feature-flags', DEMO_SERVICE_ID],
  })

  const renderConditions = (conditions: FeatureFlagConditions | null) => {
    if (!conditions) return '—'

    const parts = []
    if (conditions.percentage !== undefined) {
      parts.push(
        `${conditions.percentage}% ${m.flags_percentage().toLowerCase()}`,
      )
    }
    if (conditions.countries?.length) {
      parts.push(`${m.flags_countries()}: ${conditions.countries.join(', ')}`)
    }
    if (conditions.deviceTypes?.length) {
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
                  <Input placeholder="new_feature" />
                </div>
                <div className="space-y-2">
                  <Label>{m.flags_description()}</Label>
                  <Input placeholder="Description of this flag" />
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
            <CardDescription>
              Manage feature flags for your project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.flags_key()}</TableHead>
                    <TableHead>{m.flags_description()}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{m.flags_conditions()}</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagsQuery.data ? (
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
                      <TableCell className="text-center" colSpan={5}>
                        {m.common_noData()}
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
