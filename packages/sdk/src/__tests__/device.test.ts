import { afterEach, describe, expect, it, vi } from 'vitest'

import { getDeviceInfo } from '../device'

const setUserAgent = (ua: string) => {
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: ua,
  })
}

describe('getDeviceInfo', () => {
  const originalUA = navigator.userAgent

  afterEach(() => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: originalUA,
    })
    vi.restoreAllMocks()
  })

  it('detects Chrome on macOS', () => {
    setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    )

    const info = getDeviceInfo()

    expect(info.browserName).toBe('Chrome')
    expect(info.browserVersion).toBe('120.0')
    expect(info.osName).toBe('macOS')
  })

  it('detects Firefox on Windows', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    )

    const info = getDeviceInfo()

    expect(info.browserName).toBe('Firefox')
    expect(info.browserVersion).toBe('120.0')
    expect(info.osName).toBe('Windows')
    expect(info.osVersion).toBe('10.0')
  })

  it('detects Safari on iOS', () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
    )

    const info = getDeviceInfo()

    expect(info.browserName).toBe('Safari')
    expect(info.osName).toBe('iOS')
    expect(info.osVersion).toBe('17.1')
  })

  it('detects Edge on Windows', () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0',
    )

    const info = getDeviceInfo()

    expect(info.browserName).toBe('Edge')
  })

  it('detects Android', () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    )

    const info = getDeviceInfo()

    expect(info.osName).toBe('Android')
    expect(info.osVersion).toBe('14')
  })

  it('detects Linux when no specific OS matches', () => {
    setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
    )

    const info = getDeviceInfo()

    expect(info.osName).toBe('Linux')
  })

  it('returns desktop for wide viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    })

    const info = getDeviceInfo()

    expect(info.deviceType).toBe('desktop')
  })

  it('returns tablet for medium viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    })

    const info = getDeviceInfo()

    expect(info.deviceType).toBe('tablet')
  })

  it('returns mobile for narrow viewports', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 375,
    })

    const info = getDeviceInfo()

    expect(info.deviceType).toBe('mobile')
  })

  it('includes language, screen dimensions, and timezone', () => {
    const info = getDeviceInfo()

    expect(info.language).toBeTypeOf('string')
    expect(info.screenWidth).toBeTypeOf('number')
    expect(info.screenHeight).toBeTypeOf('number')
    expect(info.timezone).toBeTypeOf('string')
  })
})
