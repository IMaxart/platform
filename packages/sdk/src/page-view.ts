import type { PageViewPayload } from './types'

/** @internal */
export type PageTracker = {
  destroy: () => void
  trackPageView: (path: string) => void
}

/** @internal */
export const createPageTracker = ({
  onPayload,
  sessionId,
}: {
  onPayload: (payload: PageViewPayload) => void
  sessionId: string
}): PageTracker => {
  let currentPath: null | string = null
  let enteredAt: null | number = null
  let lastTrackedPath: null | string = null
  let maxScrollDepth = 0

  const getScrollDepth = (): number => {
    const doc = document.documentElement
    const scrollHeight = doc.scrollHeight - doc.clientHeight

    if (scrollHeight <= 0) return 100
    return Math.round((window.scrollY / scrollHeight) * 100)
  }

  const onScroll = () => {
    if (currentPath === null) return
    const depth = getScrollDepth()
    if (depth > maxScrollDepth) maxScrollDepth = depth
  }

  const endCurrentPageView = () => {
    if (currentPath === null || enteredAt === null) return

    onPayload({
      durationMs: Date.now() - enteredAt,
      enteredAt,
      path: currentPath,
      referrer: document.referrer || null,
      scrollDepthPct: maxScrollDepth,
      sessionId,
      title: document.title,
      type: 'pageview',
    })

    currentPath = null
    enteredAt = null
    maxScrollDepth = 0
  }

  const trackPageView = (path: string) => {
    endCurrentPageView()
    currentPath = path
    lastTrackedPath = path
    enteredAt = Date.now()
    maxScrollDepth = 0
  }

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      endCurrentPageView()
    } else if (lastTrackedPath !== null && currentPath === null) {
      trackPageView(lastTrackedPath)
    }
  }

  const onBeforeUnload = () => {
    endCurrentPageView()
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('beforeunload', onBeforeUnload)

  const destroy = () => {
    endCurrentPageView()
    window.removeEventListener('scroll', onScroll)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    window.removeEventListener('beforeunload', onBeforeUnload)
  }

  return { destroy, trackPageView }
}

/** @internal */
export type HistoryPatcher = {
  destroy: () => void
}

/**
 * Patches `history.pushState`, `history.replaceState`, and listens for `popstate`
 * to detect navigation. Calls `onNavigate` with the new path on each change.
 * Also fires immediately for the current page.
 *
 * @internal
 */
export const patchHistoryApi = (
  onNavigate: (path: string) => void,
): HistoryPatcher => {
  const getCurrentPath = () => window.location.pathname + window.location.search

  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = (...args: Parameters<typeof history.pushState>): void => {
    originalPushState(...args)
    onNavigate(getCurrentPath())
  }

  history.replaceState = (
    ...args: Parameters<typeof history.replaceState>
  ): void => {
    originalReplaceState(...args)
    onNavigate(getCurrentPath())
  }

  const onPopState = () => {
    onNavigate(getCurrentPath())
  }

  window.addEventListener('popstate', onPopState)
  onNavigate(getCurrentPath())

  const destroy = () => {
    history.pushState = originalPushState
    history.replaceState = originalReplaceState
    window.removeEventListener('popstate', onPopState)
  }

  return { destroy }
}
