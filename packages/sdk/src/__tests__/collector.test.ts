import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCollector } from '../collector'
import type { ResolvedConfig } from '../types'

const createTestConfig = (
  overrides?: Partial<ResolvedConfig>,
): ResolvedConfig => ({
  endpoint: 'https://analytics.test/api/collect',
  environment: 'production',
  flagsEndpoint: 'https://analytics.test/api/flags',
  flushInterval: 1000,
  maxBatchSize: 3,
  respectDNT: false,
  trackErrors: true,
  trackPageViews: true,
  ...overrides,
})

describe('createCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: vi.fn(() => true),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('batches payloads and flushes when maxBatchSize is reached', () => {
    const config = createTestConfig({ maxBatchSize: 2 })
    const collector = createCollector(config)

    collector.enqueue({ sessionId: '1', type: 'session' } as never)
    expect(navigator.sendBeacon).not.toHaveBeenCalled()

    collector.enqueue({ sessionId: '2', type: 'session' } as never)
    expect(navigator.sendBeacon).toHaveBeenCalledOnce()

    const [url, body] = (navigator.sendBeacon as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string]
    expect(url).toBe('https://analytics.test/api/collect')

    const parsed = JSON.parse(body) as unknown[]
    expect(parsed).toHaveLength(2)

    collector.destroy()
  })

  it('flushes on timer when batch is not full', () => {
    const config = createTestConfig({ flushInterval: 500, maxBatchSize: 10 })
    const collector = createCollector(config)

    collector.enqueue({ sessionId: '1', type: 'session' } as never)
    expect(navigator.sendBeacon).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500)
    expect(navigator.sendBeacon).toHaveBeenCalledOnce()

    collector.destroy()
  })

  it('flush() sends immediately and clears the timer', () => {
    const config = createTestConfig({ flushInterval: 5000, maxBatchSize: 10 })
    const collector = createCollector(config)

    collector.enqueue({ sessionId: '1', type: 'session' } as never)
    collector.flush()

    expect(navigator.sendBeacon).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(5000)
    expect(navigator.sendBeacon).toHaveBeenCalledOnce()

    collector.destroy()
  })

  it('destroy() flushes remaining payloads', () => {
    const config = createTestConfig({ maxBatchSize: 10 })
    const collector = createCollector(config)

    collector.enqueue({ sessionId: '1', type: 'session' } as never)
    collector.enqueue({ sessionId: '2', type: 'session' } as never)
    collector.destroy()

    expect(navigator.sendBeacon).toHaveBeenCalledOnce()
  })

  it('does not send when queue is empty', () => {
    const config = createTestConfig()
    const collector = createCollector(config)

    collector.flush()
    expect(navigator.sendBeacon).not.toHaveBeenCalled()

    collector.destroy()
  })

  it('falls back to fetch when sendBeacon is unavailable', () => {
    vi.stubGlobal('navigator', { sendBeacon: undefined })
    const fetchMock = vi.fn(() => Promise.resolve(new Response()))
    vi.stubGlobal('fetch', fetchMock)

    const config = createTestConfig({ maxBatchSize: 1 })
    const collector = createCollector(config)

    collector.enqueue({ sessionId: '1', type: 'session' } as never)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://analytics.test/api/collect',
      expect.objectContaining({
        keepalive: true,
        method: 'POST',
      }),
    )

    collector.destroy()
  })
})
