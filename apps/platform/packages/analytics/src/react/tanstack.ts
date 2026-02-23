import { analytics } from '../analytics'

/**
 * Minimal router interface compatible with TanStack Router.
 * Only the subset of the router API needed for page view tracking.
 */
type TanStackRouterLike = {
  state: {
    location: {
      pathname: string
      search: string
    }
  }
  subscribe: (event: 'onResolved', callback: () => void) => () => void
}

/**
 * Enable automatic page view tracking for TanStack Router.
 * Call once in your app entry or root component.
 *
 * When using this adapter, set `trackPageViews: false` in `analytics.init()`
 * to avoid duplicate tracking from the built-in History API patcher.
 *
 * @param router - The TanStack Router instance.
 * @returns A cleanup function to stop tracking. Call when unmounting.
 *
 * @example
 * ```typescript
 * import { analytics } from '@imaxart/analytics'
 * import { enableTanStackRouterTracking } from '@imaxart/analytics/react'
 * import { router } from './router'
 *
 * analytics.init({ domain: 'analytics.example.com', trackPageViews: false })
 * const cleanup = enableTanStackRouterTracking(router)
 * ```
 */
export const enableTanStackRouterTracking = (
  router: TanStackRouterLike,
): (() => void) => {
  const { pathname, search } = router.state.location
  analytics.trackPageView(`${pathname}${search}`)

  const unsubscribe = router.subscribe('onResolved', () => {
    const { pathname: p, search: s } = router.state.location
    analytics.trackPageView(`${p}${s}`)
  })

  return unsubscribe
}
