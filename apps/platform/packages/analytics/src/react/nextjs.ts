import { useEffect, useRef } from 'react'

import { analytics } from '../analytics'

/**
 * Track page views in Next.js App Router.
 *
 * Pass the `pathname` from Next.js `usePathname()`. The hook tracks the initial
 * page view on mount and subsequent navigations when the pathname changes.
 *
 * When using this hook, set `trackPageViews: false` in `analytics.init()`
 * to avoid duplicate tracking from the built-in History API patcher.
 *
 * @param pathname - The current pathname from `usePathname()`.
 *
 * @example
 * ```tsx
 * 'use client'
 *
 * import { usePathname } from 'next/navigation'
 * import { useNextPageTracking } from '@imaxart/analytics/react'
 *
 * const RootLayout = ({ children }: { children: React.ReactNode }) => {
 *   const pathname = usePathname()
 *   useNextPageTracking(pathname)
 *
 *   return <>{children}</>
 * }
 * ```
 */
export const useNextPageTracking = (pathname: string): void => {
  const prevPathname = useRef<null | string>(null)

  useEffect(() => {
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname
      analytics.trackPageView(pathname)
    }
  }, [pathname])
}
