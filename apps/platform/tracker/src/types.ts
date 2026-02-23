export type AnalyticsAPI = {
  getFlag: (key: string) => Promise<boolean>
  track: (name: string, properties?: Record<string, unknown>) => void
}

export type CollectPayload =
  | ErrorPayload
  | EventPayload
  | PageViewPayload
  | SessionPayload

export type DeviceInfo = {
  browserName: string
  browserVersion: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  language: string
  osName: string
  osVersion: string
  screenHeight: number
  screenWidth: number
  timezone: string
}

export type ErrorPayload = {
  columnNumber: null | number
  level: 'error' | 'warning'
  lineNumber: null | number
  message: string
  path: string
  sessionId: string
  sourceUrl: null | string
  stack: null | string
  type: 'error'
}

export type EventPayload = {
  name: string
  path: string
  properties: null | Record<string, unknown>
  sessionId: string
  type: 'event'
}

export type PageViewPayload = {
  durationMs: null | number
  enteredAt: number
  path: string
  referrer: null | string
  scrollDepthPct: null | number
  sessionId: string
  title: string
  type: 'pageview'
}

export type SessionData = {
  id: string
  startedAt: number
}

export type SessionPayload = {
  device: DeviceInfo
  referrer: null | string
  sessionId: string
  type: 'session'
  utmCampaign: null | string
  utmContent: null | string
  utmMedium: null | string
  utmSource: null | string
  utmTerm: null | string
}

export type TrackerConfig = {
  endpoint: string
  flushInterval: number
  maxBatchSize: number
}
