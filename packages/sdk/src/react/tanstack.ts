import { analytics } from '../analytics'

/**
 * Minimal router interface compatible with TanStack Router.
 * Only the subset of the router API needed for page view tracking.
 *
 * `search` is typed as `unknown` because TanStack Router v1 exposes a parsed
 * object there, not a raw query string. The adapter prefers `searchStr` (the
 * raw string present in v1) and falls back to stringifying `search`.
 */
type TanStackRouterLike = {
  state: {
    location: {
      pathname: string
      search: unknown
      searchStr?: string
    }
  }
  subscribe: (event: 'onResolved', callback: () => void) => () => void
}

const resolveSearch = (
  location: TanStackRouterLike['state']['location'],
): string => {
  if (typeof location.searchStr === 'string') return location.searchStr
  if (typeof location.search === 'string') return location.search
  return ''
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
 * analytics.init({ domain: { platform: 'platform.example.com', site: 'example.com' }, trackPageViews: false })
 * const cleanup = enableTanStackRouterTracking(router)
 * ```
 */
export const enableTanStackRouterTracking = (
  router: TanStackRouterLike,
): (() => void) => {
  let lastPath: null | string = null

  const trackIfChanged = () => {
    const search = resolveSearch(router.state.location)
    const path = `${router.state.location.pathname}${search}`
    if (path === lastPath) return
    lastPath = path
    analytics.trackPageView(path)
  }

  trackIfChanged()

  const unsubscribe = router.subscribe('onResolved', trackIfChanged)

  return unsubscribe
}
