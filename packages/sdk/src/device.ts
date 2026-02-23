import type { DeviceInfo } from './types'

type ParsedUA = {
  browserName: string
  browserVersion: string
  osName: string
  osVersion: string
}

const extractVersion = (ua: string, pattern: RegExp): string =>
  pattern.exec(ua)?.[1]?.replace(/_/g, '.') ?? '0'

const parseUA = (): ParsedUA => {
  const ua = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = '0'
  let osName = 'Unknown'
  let osVersion = '0'

  if (/iPhone|iPad|iPod/.test(ua)) {
    osName = 'iOS'
    osVersion = extractVersion(ua, /OS (\d+_\d+)/)
  } else if (ua.includes('Android')) {
    osName = 'Android'
    osVersion = extractVersion(ua, /Android (\d+\.?\d*)/)
  } else if (ua.includes('Windows')) {
    osName = 'Windows'
    osVersion = extractVersion(ua, /Windows NT (\d+\.\d+)/)
  } else if (ua.includes('Mac OS X')) {
    osName = 'macOS'
    osVersion = extractVersion(ua, /Mac OS X (\d+[._]\d+[._]?\d*)/)
  } else if (ua.includes('Linux')) {
    osName = 'Linux'
  }

  const browsers: { name: string; pattern: RegExp; test: string }[] = [
    { name: 'Arc', pattern: /Arc\/(\d+\.?\d*)/, test: 'Arc/' },
    { name: 'Zen', pattern: /Zen\/(\d+\.?\d*)/, test: 'Zen/' },
    { name: 'Edge', pattern: /Edg\/(\d+\.?\d*)/, test: 'Edg/' },
    { name: 'Opera', pattern: /OPR\/(\d+\.?\d*)/, test: 'OPR/' },
    { name: 'Firefox', pattern: /Firefox\/(\d+\.?\d*)/, test: 'Firefox/' },
    { name: 'Chrome', pattern: /Chrome\/(\d+\.?\d*)/, test: 'Chrome/' },
    { name: 'Safari', pattern: /Version\/(\d+\.?\d*)/, test: 'Safari/' },
  ]

  for (const browser of browsers) {
    if (ua.includes(browser.test)) {
      browserName = browser.name
      browserVersion = extractVersion(ua, browser.pattern)
      break
    }
  }

  return { browserName, browserVersion, osName, osVersion }
}

const getDeviceType = (): 'desktop' | 'mobile' | 'tablet' => {
  const width = window.innerWidth

  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

/** @internal */
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
