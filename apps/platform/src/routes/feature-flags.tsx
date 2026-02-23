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
import { useTranslation } from 'react-i18next'

import { Header } from '~/components/layout/header'
import { getFeatureFlags } from '~/lib/server/queries'

export const Route = createFileRoute('/feature-flags')({
  component: FeatureFlagsPage,
})

const DEMO_PROJECT_ID = '00000000-0000-0000-0000-000000000000'

function FeatureFlagsPage() {
  const { t } = useTranslation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const flagsQuery = useQuery({
    enabled: false,
    queryFn: () => getFeatureFlags({ data: DEMO_PROJECT_ID }),
    queryKey: ['feature-flags', DEMO_PROJECT_ID],
  })

  const renderConditions = (conditions: FeatureFlagConditions | null) => {
    if (!conditions) return '—'

    const parts = []
    if (conditions.percentage !== undefined) {
      parts.push(
        `${conditions.percentage}% ${t('flags.percentage').toLowerCase()}`,
      )
    }
    if (conditions.countries?.length) {
      parts.push(`${t('flags.countries')}: ${conditions.countries.join(', ')}`)
    }
    if (conditions.deviceTypes?.length) {
      parts.push(
        `${t('flags.deviceTypes')}: ${conditions.deviceTypes.join(', ')}`,
      )
    }

    return parts.length > 0 ? parts.join(' | ') : '—'
  }

  return (
    <>
      <Header title={t('flags.title')} />
      <div className="flex-1 space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div />
          <Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('flags.createFlag')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('flags.createFlag')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('flags.key')}</Label>
                  <Input placeholder="new_feature" />
                </div>
                <div className="space-y-2">
                  <Label>{t('flags.description')}</Label>
                  <Input placeholder="Description of this flag" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch />
                  <Label>{t('flags.enabled')}</Label>
                </div>
                <div className="space-y-2">
                  <Label>{t('flags.percentage')}</Label>
                  <Input max="100" min="0" placeholder="100" type="number" />
                </div>
                <Button className="w-full">{t('common.create')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              {t('flags.title')}
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
                    <TableHead>{t('flags.key')}</TableHead>
                    <TableHead>{t('flags.description')}</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>{t('flags.conditions')}</TableHead>
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
                              ? t('flags.enabled')
                              : t('flags.disabled')}
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
                        {t('common.noData')}
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
