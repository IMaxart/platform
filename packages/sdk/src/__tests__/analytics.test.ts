import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Analytics } from '../analytics'

describe('Analytics', () => {
  const TEST_UA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'

  beforeEach(() => {
    sessionStorage.clear()
    vi.stubGlobal('navigator', {
      ...navigator,
      doNotTrack: null,
      language: 'en-US',
      sendBeacon: vi.fn(() => true),
      userAgent: TEST_UA,
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response())),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes and creates a session', () => {
    const instance = new Analytics()
    instance.init({ domain: 'analytics.test' })

    expect(navigator.sendBeacon).not.toHaveBeenCalled()

    instance.track('test-event')
    instance.destroy()
  })

  it('no-ops init when window is undefined (SSR)', () => {
    const originalWindow = globalThis.window
    // @ts-expect-error -- simulating SSR
    delete globalThis.window

    const instance = new Analytics()
    instance.init({ domain: 'analytics.test' })
    instance.track('test-event')

    globalThis.window = originalWindow
    instance.destroy()
  })

  it('respects DNT when enabled', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      doNotTrack: '1',
      language: 'en-US',
      sendBeacon: vi.fn(() => true),
      userAgent: TEST_UA,
    })

    const instance = new Analytics()
    instance.init({ domain: 'analytics.test', respectDNT: true })

    instance.track('test-event')
    instance.destroy()

    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('ignores DNT when respectDNT is false', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      doNotTrack: '1',
      language: 'en-US',
      sendBeacon: vi.fn(() => true),
      userAgent: TEST_UA,
    })

    const instance = new Analytics()
    instance.init({ domain: 'analytics.test', respectDNT: false })

    instance.track('test-event')
    instance.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalled()
  })

  it('track enqueues an event payload', () => {
    const instance = new Analytics()
    instance.init({
      domain: 'analytics.test',
      maxBatchSize: 100,
      respectDNT: false,
    })

    instance.track('click', { buttonId: 'cta' })
    instance.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalled()
    const body = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as string
    const payloads = JSON.parse(body) as { type: string }[]
    const eventPayload = payloads.find((p) => p.type === 'event')
    expect(eventPayload).toBeDefined()
  })

  it('does nothing when track is called before init', () => {
    const instance = new Analytics()
    instance.track('orphan-event')
    expect(navigator.sendBeacon).not.toHaveBeenCalled()
  })

  it('identify sends an identify payload', () => {
    const instance = new Analytics()
    instance.init({
      domain: 'analytics.test',
      maxBatchSize: 100,
      respectDNT: false,
    })

    instance.identify({ name: 'Dev Laptop' })
    instance.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalled()
    const body = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as string
    const payloads = JSON.parse(body) as { type: string }[]
    const identifyPayload = payloads.find((p) => p.type === 'identify')
    expect(identifyPayload).toBeDefined()
  })

  it('getFlag returns false when not initialized', async () => {
    const instance = new Analytics()
    const result = await instance.getFlag('feature-x')
    expect(result).toBe(false)
  })

  it('destroy cleans up and allows re-init', () => {
    const instance = new Analytics()
    instance.init({ domain: 'analytics.test', respectDNT: false })
    instance.destroy()

    instance.init({ domain: 'analytics.test', respectDNT: false })
    instance.track('after-reinit')
    instance.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalled()
  })

  it('re-init destroys previous state first', () => {
    const instance = new Analytics()
    instance.init({ domain: 'analytics.test', respectDNT: false })
    instance.init({ domain: 'analytics2.test', respectDNT: false })

    instance.destroy()
  })

  it('skips reinit when called with the same domain (idempotency)', () => {
    const instance = new Analytics()
    const config = { domain: 'analytics.test', respectDNT: false }

    instance.init(config)
    instance.init(config)
    instance.init(config)

    instance.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1)
    const body = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1] as string
    const payloads = JSON.parse(body) as { type: string }[]
    const sessions = payloads.filter((p) => p.type === 'session')
    const pageViews = payloads.filter((p) => p.type === 'pageview')
    expect(sessions).toHaveLength(1)
    expect(pageViews).toHaveLength(1)
  })

  it('reinitializes when domain changes', () => {
    const instance = new Analytics()

    instance.init({ domain: 'analytics.test', respectDNT: false })
    instance.init({ domain: 'analytics2.test', respectDNT: false })

    instance.destroy()

    const calls = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBeGreaterThanOrEqual(1)
  })
})
