import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { analytics } from '../analytics'
import { enableTanStackRouterTracking } from '../react/tanstack'

vi.mock('../analytics', () => ({
  analytics: { trackPageView: vi.fn() },
}))

const trackPageView = vi.mocked(analytics.trackPageView)

type Location = {
  pathname: string
  search: unknown
  searchStr?: string
}

const createMockRouter = (location: Location) => {
  const listeners: (() => void)[] = []

  return {
    emit: () => {
      listeners.forEach((cb) => {
        cb()
      })
    },
    setLocation: (loc: Location) => {
      Object.assign(location, loc)
    },
    state: { location },
    subscribe: (_event: 'onResolved', cb: () => void) => {
      listeners.push(cb)
      return () => {
        const idx = listeners.indexOf(cb)
        if (idx !== -1) listeners.splice(idx, 1)
      }
    },
  }
}

describe('enableTanStackRouterTracking', () => {
  beforeEach(() => {
    trackPageView.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('tracks initial page view on setup', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)

    expect(trackPageView).toHaveBeenCalledTimes(1)
    expect(trackPageView).toHaveBeenCalledWith('/')

    cleanup()
  })

  it('tracks page view when path changes', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)

    router.setLocation({ pathname: '/blog', search: {} })
    router.emit()

    expect(trackPageView).toHaveBeenCalledTimes(2)
    expect(trackPageView).toHaveBeenLastCalledWith('/blog')

    cleanup()
  })

  it('deduplicates when onResolved fires multiple times for the same path', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)

    router.emit()
    router.emit()
    router.emit()

    expect(trackPageView).toHaveBeenCalledTimes(1)

    cleanup()
  })

  it('deduplicates after navigation when onResolved fires multiple times', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)

    router.setLocation({ pathname: '/blog', search: {} })
    router.emit()
    router.emit()
    router.emit()

    expect(trackPageView).toHaveBeenCalledTimes(2)
    expect(trackPageView).toHaveBeenNthCalledWith(1, '/')
    expect(trackPageView).toHaveBeenNthCalledWith(2, '/blog')

    cleanup()
  })

  it('tracks correctly across a full navigation sequence', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)

    router.setLocation({ pathname: '/blog', search: {} })
    router.emit()
    router.emit()

    router.setLocation({ pathname: '/experience', search: {} })
    router.emit()

    router.setLocation({ pathname: '/blog', search: {} })
    router.emit()
    router.emit()
    router.emit()

    router.setLocation({ pathname: '/', search: {} })
    router.emit()

    expect(trackPageView).toHaveBeenCalledTimes(5)
    expect(trackPageView).toHaveBeenNthCalledWith(1, '/')
    expect(trackPageView).toHaveBeenNthCalledWith(2, '/blog')
    expect(trackPageView).toHaveBeenNthCalledWith(3, '/experience')
    expect(trackPageView).toHaveBeenNthCalledWith(4, '/blog')
    expect(trackPageView).toHaveBeenNthCalledWith(5, '/')

    cleanup()
  })

  it('includes searchStr in deduplication', () => {
    const router = createMockRouter({
      pathname: '/blog',
      search: {},
      searchStr: '?page=1',
    })
    const cleanup = enableTanStackRouterTracking(router)

    expect(trackPageView).toHaveBeenCalledWith('/blog?page=1')

    router.emit()
    expect(trackPageView).toHaveBeenCalledTimes(1)

    router.setLocation({ pathname: '/blog', search: {}, searchStr: '?page=2' })
    router.emit()
    expect(trackPageView).toHaveBeenCalledTimes(2)
    expect(trackPageView).toHaveBeenLastCalledWith('/blog?page=2')

    cleanup()
  })

  it('cleanup stops tracking', () => {
    const router = createMockRouter({ pathname: '/', search: {} })
    const cleanup = enableTanStackRouterTracking(router)
    cleanup()

    router.setLocation({ pathname: '/blog', search: {} })
    router.emit()

    expect(trackPageView).toHaveBeenCalledTimes(1)
  })
})
