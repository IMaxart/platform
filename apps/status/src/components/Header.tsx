import type { PublicPageResponse } from '~/shared/api-types'

import { Button } from '@platform/ui/components/button'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'

import { fetchJson } from '~/lib/api-client'

const Header = () => {
  const contextQuery = useQuery({
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      return await fetchJson<PublicPageResponse>({ url: '/api/public/page' })
    },
    queryKey: ['publicPage'],
    staleTime: 30_000,
  })

  const showAdminLink = (() => {
    if (!contextQuery.data) return false
    return contextQuery.data.mode === 'admin'
  })()

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link className="flex items-center gap-2 font-semibold" to="/">
          <Activity aria-hidden className="text-primary h-5 w-5" />
          <span>Status</span>
        </Link>

        {showAdminLink ? (
          <Button asChild size="sm" variant="ghost">
            <Link to="/admin">Admin</Link>
          </Button>
        ) : null}
      </div>
    </header>
  )
}

export default Header
