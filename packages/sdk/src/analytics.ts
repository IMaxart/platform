import type { Collector } from './collector'
import type { ErrorTracker } from './errors'
import type { FlagClient } from './flags'
import type { HistoryPatcher, PageTracker } from './page-view'
import type {
  AnalyticsConfig,
  EventProperties,
  FlagValue,
  IdentifyProperties,
  ResolvedConfig,
  SessionPayload,
} from './types'

import { createCollector } from './collector'
import { getDeviceInfo } from './device'
import { createErrorTracker } from './errors'
import { createFlagClient } from './flags'
import { createPageTracker, patchHistoryApi } from './page-view'
import { getOrCreateSession } from './session'

const resolveConfig = (config: AnalyticsConfig): ResolvedConfig => {
  const protocol = config.domain.startsWith('http') ? '' : 'https://'
  const baseUrl = `${protocol}${config.domain}`

  return {
    endpoint: `${baseUrl}/api/collect`,
    environment: config.environment ?? 'production',
    flagsEndpoint: `${baseUrl}/api/flags`,
    flushInterval: config.flushInterval ?? 5000,
    maxBatchSize: config.maxBatchSize ?? 10,
    respectDNT: config.respectDNT ?? true,
    trackErrors: config.trackErrors ?? true,
    trackPageViews: config.trackPageViews ?? true,
  }
}

const isDNTEnabled = (): boolean => {
  if (typeof navigator === 'undefined') return false
  const dnt =
    navigator.doNotTrack ??
    (window as unknown as Record<string, string>).doNotTrack
  return dnt === '1' || dnt === 'yes'
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

/**
 * Core analytics client. Use the pre-configured singleton {@link analytics} for most use cases,
 * or instantiate directly for multiple tracking instances.
 *
 * @example
 * ```typescript
 * import { Analytics } from '@imaxart/analytics'
 *
 * const tracker = new Analytics()
 * tracker.init({ domain: 'analytics.example.com' })
 * tracker.track('page_click', { buttonId: 'cta' })
 * tracker.destroy()
 * ```
 */
export class Analytics {
  private cleanupFns: (() => void)[] = []
  private collector: Collector | null = null
  private errorTracker: ErrorTracker | null = null
  private flagClient: FlagClient | null = null
  private historyPatcher: HistoryPatcher | null = null
  private pageTracker: null | PageTracker = null
  private sessionId: null | string = null

  /**
   * Flush all pending events and clean up all listeners.
   * Call this before unmounting or when analytics is no longer needed.
   */
  destroy = (): void => {
    this.historyPatcher?.destroy()
    this.pageTracker?.destroy()
    this.errorTracker?.destroy()
    this.flagClient?.destroy()
    this.collector?.destroy()

    for (const cleanup of this.cleanupFns) {
      cleanup()
    }

    this.sessionId = null
    this.collector = null
    this.pageTracker = null
    this.historyPatcher = null
    this.errorTracker = null
    this.flagClient = null
    this.cleanupFns = []
  }

  /**
   * Get the value of a feature flag. Results are cached for 5 minutes.
   *
   * @param key - The feature flag key.
   * @returns The flag value, or `false` if not found or analytics is not initialized.
   *
   * @example
   * ```typescript
   * const enabled = await analytics.getFlag('new-feature')
   * if (enabled) {
   *   showNewFeature()
   * }
   * ```
   */
  getFlag = async (key: string): Promise<FlagValue> => {
    if (!this.flagClient) return false
    return this.flagClient.getFlag(key)
  }

  /**
   * Identify the current device/visitor with metadata.
   * Used for device exclusion in the analytics dashboard.
   *
   * @param properties - Identifying metadata for this device.
   *
   * @example
   * ```typescript
   * analytics.identify({ name: 'Developer Laptop' })
   * ```
   */
  identify = (properties: IdentifyProperties): void => {
    if (!this.collector || !this.sessionId) return

    this.collector.enqueue({
      properties,
      sessionId: this.sessionId,
      type: 'identify',
    })
  }

  /**
   * Initialize the analytics client. Must be called before any other method.
   * Safe to call in SSR environments -- silently no-ops when `window` is unavailable.
   *
   * @param config - Analytics configuration. Only `domain` is required.
   *
   * @example
   * ```typescript
   * analytics.init({
   *   domain: 'analytics.example.com',
   *   trackPageViews: true,
   *   trackErrors: true,
   *   respectDNT: true,
   * })
   * ```
   */
  init = (config: AnalyticsConfig): void => {
    if (typeof window === 'undefined') return

    if (this.collector) {
      this.destroy()
    }

    const resolved = resolveConfig(config)

    if (resolved.respectDNT && isDNTEnabled()) return

    const session = getOrCreateSession()
    this.sessionId = session.id

    this.collector = createCollector(resolved)

    const device = getDeviceInfo()
    const utm = getUTMParams()
    const sessionPayload: SessionPayload = {
      device,
      environment: resolved.environment,
      referrer: document.referrer || null,
      sessionId: session.id,
      type: 'session',
      ...utm,
    }
    this.collector.enqueue(sessionPayload)

    this.flagClient = createFlagClient({
      flagsEndpoint: resolved.flagsEndpoint,
      sessionId: session.id,
    })

    this.pageTracker = createPageTracker({
      onPayload: (payload) => this.collector?.enqueue(payload),
      sessionId: session.id,
    })

    if (resolved.trackPageViews) {
      this.historyPatcher = patchHistoryApi((path) => {
        this.pageTracker?.trackPageView(path)
      })
    }

    if (resolved.trackErrors) {
      this.errorTracker = createErrorTracker({
        onPayload: (payload) => this.collector?.enqueue(payload),
        sessionId: session.id,
      })
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        this.collector?.flush()
      }
    }

    const onBeforeUnload = () => {
      this.collector?.flush()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)

    this.cleanupFns.push(() => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
    })
  }

  /**
   * Track a custom event with optional properties.
   *
   * @param event - The event name (e.g., `'button_click'`, `'form_submit'`).
   * @param properties - Optional key-value pairs describing the event.
   *
   * @example
   * ```typescript
   * analytics.track('button_click', { buttonId: 'cta', variant: 'blue' })
   * ```
   */
  track = (event: string, properties?: EventProperties): void => {
    if (!this.collector || !this.sessionId) return

    this.collector.enqueue({
      name: event,
      path: window.location.pathname + window.location.search,
      properties: properties ?? null,
      sessionId: this.sessionId,
      type: 'event',
    })
  }

  /**
   * Manually track a page view. Useful when automatic history-based tracking
   * is disabled (`trackPageViews: false`) and a framework-specific adapter
   * or custom routing is used.
   *
   * @param path - The page path (e.g., `'/about'`, `'/products?id=123'`).
   *
   * @example
   * ```typescript
   * analytics.trackPageView('/custom-path')
   * ```
   */
  trackPageView = (path: string): void => {
    this.pageTracker?.trackPageView(path)
  }
}

const GLOBAL_KEY = Symbol.for('@imaxart/analytics')

/**
 * Pre-configured singleton instance. Import and use directly in most cases.
 *
 * The singleton is stored on `globalThis` to ensure a single instance exists
 * even when the SDK code is bundled into multiple entry points.
 *
 * @example
 * ```typescript
 * import { analytics } from '@imaxart/analytics'
 *
 * analytics.init({ domain: 'analytics.example.com' })
 * analytics.track('page_view')
 * ```
 */
export const analytics: Analytics = (() => {
  const global = globalThis as unknown as Record<symbol, Analytics | undefined>

  global[GLOBAL_KEY] ??= new Analytics()

  return global[GLOBAL_KEY]
})()
