import type { DeviceInfo } from './types'

const parseUA = (): {
  browserName: string
  browserVersion: string
  osName: string
  osVersion: string
} => {
  const ua = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = '0'
  let osName = 'Unknown'
  let osVersion = '0'

  if (ua.includes('Windows')) {
    osName = 'Windows'
    osVersion = (/Windows NT (\d+\.\d+)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS'
    osVersion =
      (/Mac OS X (\d+[._]\d+[._]?\d*)/.exec(ua) ?? [])[1]?.replace(/_/g, '.') ??
      '0'
  } else if (ua.includes('Android')) {
    osName = 'Android'
    osVersion = (/Android (\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (/iPhone|iPad/.test(ua)) {
    osName = 'iOS'
    osVersion = (/OS (\d+_\d+)/.exec(ua) ?? [])[1]?.replace(/_/g, '.') ?? '0'
  } else if (ua.includes('Linux')) {
    osName = 'Linux'
    osVersion = '0'
  }

  if (ua.includes('Arc/')) {
    browserName = 'Arc'
    browserVersion = (/Arc\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Zen/')) {
    browserName = 'Zen'
    browserVersion = (/Zen\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Edg/')) {
    browserName = 'Edge'
    browserVersion = (/Edg\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('OPR/')) {
    browserName = 'Opera'
    browserVersion = (/OPR\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Firefox/')) {
    browserName = 'Firefox'
    browserVersion = (/Firefox\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome'
    browserVersion = (/Chrome\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  } else if (ua.includes('Safari/')) {
    browserName = 'Safari'
    browserVersion = (/Version\/(\d+\.?\d*)/.exec(ua) ?? [])[1] ?? '0'
  }

  return { browserName, browserVersion, osName, osVersion }
}

const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const width = window.innerWidth

  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/**
 * Derives browser, OS, screen, and timezone info from the user agent and environment.
 * @returns DeviceInfo object
 */
export const getDeviceInfo = (): DeviceInfo => {
  const { browserName, browserVersion, osName, osVersion } = parseUA()

  return {
    browserName,
    browserVersion,
    deviceType: getDeviceType(),
    language: navigator.language,
    osName,
    osVersion,
    screenHeight: window.screen.height,
    screenWidth: window.screen.width,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}
