import { Card, CardContent } from '@platform/ui/components/card'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'

import {
  PublicStatusPage,
  PublicStatusPageSkeleton,
} from '~/components/public/public-status-page'
import { fetchJson } from '~/lib/api-client'
import * as m from '~/paraglide/messages'
import type { PublicPageResponse } from '~/shared/api-types'

export const Route = createFileRoute('/')({
  component: IndexRoute,
})

function IndexRoute() {
  const pageQuery = useQuery({
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      return await fetchJson<PublicPageResponse>({ url: '/api/public/page' })
    },
    queryKey: ['publicPage'],
    refetchInterval: 30_000,
  })

  if (pageQuery.isPending) return <PublicStatusPageSkeleton />

  if (pageQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-12 md:px-8">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <AlertCircle className="text-muted-foreground h-8 w-8" />
            <p className="text-muted-foreground text-sm">
              {m.failedToLoadPage()}
            </p>
          </CardContent>
        </Card>
      </main>
    )
  }

  const data = pageQuery.data
  if (data.mode === 'public') return <PublicStatusPage data={data} />

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 md:px-8">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            {m.noServiceForHost({ host: data.host })}
          </p>
        </CardContent>
      </Card>
    </main>
  )
}
