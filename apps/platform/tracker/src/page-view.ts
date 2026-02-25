import type { PageViewPayload, TrackerConfig } from './types'

import { enqueue } from './collector'

let currentPath: null | string = null
let enteredAt: null | number = null
let maxScrollDepth = 0

const getScrollDepth = (): number => {
  const doc = document.documentElement
  const scrollTop = window.scrollY
  const scrollHeight = doc.scrollHeight - doc.clientHeight

  if (scrollHeight <= 0) return 100
  return Math.round((scrollTop / scrollHeight) * 100)
}

const trackScroll = () => {
  const depth = getScrollDepth()
  if (depth > maxScrollDepth) {
    maxScrollDepth = depth
  }
}

const endPageView = ({
  config,
  sessionId,
}: {
  config: TrackerConfig
  sessionId: string
}) => {
  if (currentPath === null || enteredAt === null) return

  const payload: PageViewPayload = {
    durationMs: Date.now() - enteredAt,
    enteredAt,
    path: currentPath,
    referrer: document.referrer || null,
    scrollDepthPct: maxScrollDepth,
    sessionId,
    title: document.title,
    type: 'pageview',
  }

  enqueue(payload, config)
  currentPath = null
  enteredAt = null
  maxScrollDepth = 0
}

const startPageView = (path: string) => {
  currentPath = path
  enteredAt = Date.now()
  maxScrollDepth = 0
}

/**
 * Hooks history, scroll, and visibility to track page views and scroll depth.
 * @param config - Tracker config for enqueue
 * @param sessionId - Current session identifier
 * @returns {void}
 */
export const initPageTracking = ({
  config,
  sessionId,
}: {
  config: TrackerConfig
  sessionId: string
}) => {
  window.addEventListener('scroll', trackScroll, { passive: true })

  startPageView(window.location.pathname + window.location.search)

  const originalPushState = history.pushState.bind(history)
  const originalReplaceState = history.replaceState.bind(history)

  history.pushState = (...args) => {
    endPageView({ config, sessionId })
    originalPushState(...args)
    startPageView(window.location.pathname + window.location.search)
  }

  history.replaceState = (...args) => {
    endPageView({ config, sessionId })
    originalReplaceState(...args)
    startPageView(window.location.pathname + window.location.search)
  }

  window.addEventListener('popstate', () => {
    endPageView({ config, sessionId })
    startPageView(window.location.pathname + window.location.search)
  })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      endPageView({ config, sessionId })
    } else if (currentPath === null) {
      startPageView(window.location.pathname + window.location.search)
    }
  })

  window.addEventListener('beforeunload', () => {
    endPageView({ config, sessionId })
  })
}
