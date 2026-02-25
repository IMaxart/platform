import { enqueue, flush } from './collector'
import { getDeviceInfo } from './device'
import { initErrorTracking } from './errors'
import { trackEvent } from './events'
import { getFlag } from './flags'
import { initPageTracking } from './page-view'
import { getSession } from './session'
import type { AnalyticsAPI, SessionPayload, TrackerConfig } from './types'

const isDNTEnabled = (): boolean => {
  const dnt =
    navigator.doNotTrack ??
    (window as unknown as Record<string, string>)['doNotTrack']
  return dnt === '1' || dnt === 'yes'
}

const getEndpoint = (): string => {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src]')

  for (const script of scripts) {
    if (script.src.includes('/t.js')) {
      const url = new URL(script.src)
      return `${url.origin}/api/collect`
    }
  }

  return `${window.location.origin}/api/collect`
}

const getUTMParams = () => {
  const params = new URLSearchParams(window.location.search)

  return {
    utmCampaign: params.get('utm_campaign'),
    utmContent: params.get('utm_content'),
    utmMedium: params.get('utm_medium'),
    utmSource: params.get('utm_source'),
    utmTerm: params.get('utm_term'),
  }
}

const init = () => {
  if (isDNTEnabled()) return

  const endpoint = getEndpoint()
  const config: TrackerConfig = {
    endpoint,
    flushInterval: 5000,
    maxBatchSize: 10,
  }

  const session = getSession()
  const device = getDeviceInfo()
  const utm = getUTMParams()

  const sessionPayload: SessionPayload = {
    device,
    referrer: document.referrer || null,
    sessionId: session.id,
    type: 'session',
    ...utm,
  }

  enqueue(sessionPayload, config)

  initPageTracking({ config, sessionId: session.id })
  initErrorTracking({ config, sessionId: session.id })

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush(config)
    }
  })

  window.addEventListener('beforeunload', () => {
    flush(config)
  })

  const api: AnalyticsAPI = {
    getFlag: (key) => getFlag({ endpoint, key, sessionId: session.id }),
    track: (name, properties) => {
      trackEvent({
        config,
        name,
        ...(properties !== undefined && { properties }),
        sessionId: session.id,
      })
    },
  }

  ;(window as unknown as Record<string, AnalyticsAPI>)['analytics'] = api
}

const scheduleInit = () => {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(init)
  } else {
    setTimeout(init, 0)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleInit)
} else {
  scheduleInit()
}
