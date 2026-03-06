import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createFlagClient } from '../flags'

describe('createFlagClient', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns flag value from API', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ enabled: true }), { status: 200 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    const result = await client.getFlag('feature-x')

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const firstCallUrl = String(fetchMock.mock.calls.at(0))
    expect(firstCallUrl).toContain('key=feature-x')
    expect(firstCallUrl).toContain('sid=sess-123')

    client.destroy()
  })

  it('caches flag values for subsequent calls', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ enabled: true }), { status: 200 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    await client.getFlag('feature-x')
    await client.getFlag('feature-x')

    expect(fetchMock).toHaveBeenCalledOnce()

    client.destroy()
  })

  it('refetches after cache TTL expires', async () => {
    vi.useFakeTimers()

    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ enabled: true }), { status: 200 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    await client.getFlag('feature-x')
    expect(fetchMock).toHaveBeenCalledOnce()

    vi.advanceTimersByTime(5 * 60 * 1000 + 1)
    await client.getFlag('feature-x')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    client.destroy()
    vi.useRealTimers()
  })

  it('warns and returns false for unknown flags (404)', async () => {
    const noop = () => {
      /* intentional no-op for mock */
    }
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop)
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ enabled: false, error: 'Flag not found' }),
            { status: 404 },
          ),
        ),
      ),
    )

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    const result = await client.getFlag('nonexistent-flag')
    expect(result).toBe(false)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('nonexistent-flag'),
    )

    client.destroy()
    warnSpy.mockRestore()
  })

  it('returns false on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
    )

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    const result = await client.getFlag('feature-x')
    expect(result).toBe(false)

    client.destroy()
  })

  it('returns false on network error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('Network error'))),
    )

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    const result = await client.getFlag('feature-x')
    expect(result).toBe(false)

    client.destroy()
  })

  it('destroy clears cache', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ enabled: true }), { status: 200 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const client = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    await client.getFlag('feature-x')
    client.destroy()

    const newClient = createFlagClient({
      flagsEndpoint: 'https://analytics.test/api/flags',
      sessionId: 'sess-123',
      siteDomain: 'analytics.test',
    })

    await newClient.getFlag('feature-x')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    newClient.destroy()
  })
})
