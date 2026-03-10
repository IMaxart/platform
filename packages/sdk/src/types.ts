/**
 * Configuration for analytics initialization.
 *
 * @example
 * ```typescript
 * import { analytics } from '@imaxart/analytics'
 *
 * analytics.init({
 *   domain: { platform: 'platform.example.com', site: 'example.com' },
 *   trackPageViews: true,
 *   trackErrors: true,
 * })
 * ```
 */
export type AnalyticsConfig = {
  /** Domain configuration for the analytics server and tracked site. */
  domain: DomainConfig
  /** Environment name for multi-environment tracking (e.g., `'production'`, `'staging'`, `'development'`). @default 'production' */
  environment?: string | undefined
  /** Interval in milliseconds between automatic batch flushes. @default 5000 */
  flushInterval?: number | undefined
  /** Maximum number of events to batch before flushing to the server. @default 10 */
  maxBatchSize?: number | undefined
  /** Respect the browser's Do Not Track (DNT) setting. When enabled and DNT is active, no data is collected. @default true */
  respectDNT?: boolean | undefined
  /** Capture console errors, unhandled rejections, and window errors. @default true */
  trackErrors?: boolean | undefined
  /** Automatically track page views via History API patching. @default true */
  trackPageViews?: boolean | undefined
}

/** @internal */
export type CollectPayload =
  | ErrorPayload
  | EventPayload
  | IdentifyPayload
  | PageViewPayload
  | SessionPayload

/** @internal */
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

/**
 * Domain configuration for the analytics SDK.
 *
 * @example
 * ```typescript
 * // Same domain for platform and tracked site (site defaults to platform)
 * { platform: 'platform.example.com', site: 'example.com' }
 *
 * // Custom subdomain setup
 * { platform: 'platform.club-life.pl', site: 'club-life.pl' }
 * ```
 */
export type DomainConfig = {
  /** Analytics server domain (e.g., `'platform.example.com'`). The SDK derives API endpoints from this. */
  platform: string
  /** Tracked site domain (e.g., `'example.com'`). When omitted, defaults to `platform`. Use when the analytics server lives on a different subdomain than the tracked site. */
  site?: string | undefined
}

/** @internal */
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

/** @internal */
export type EventPayload = {
  name: string
  path: string
  properties: EventProperties | null
  sessionId: string
  type: 'event'
}

/**
 * Strongly typed event properties.
 * Keys are strings; values must be primitives or null.
 *
 * @example
 * ```typescript
 * analytics.track('button_click', {
 *   buttonId: 'cta-hero',
 *   variant: 'blue',
 *   position: 3,
 *   isLoggedIn: true,
 * })
 * ```
 */
export type EventProperties = Record<string, boolean | null | number | string>

/**
 * Feature flag value.
 * Boolean for simple on/off flags, string for multivariate experiments.
 */
export type FlagValue = boolean | string

/** @internal */
export type IdentifyPayload = {
  properties: IdentifyProperties
  sessionId: string
  type: 'identify'
}

/**
 * Properties passed to the {@link Analytics.identify} method.
 * Used to tag a device/visitor for exclusion from analytics statistics.
 *
 * @example
 * ```typescript
 * analytics.identify({ name: 'Developer Laptop' })
 * ```
 */
export type IdentifyProperties = {
  /** Human-readable name for this device (e.g., `'Developer Laptop'`). */
  name?: string | undefined
}

/** @internal */
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

/** @internal Resolved configuration with all defaults applied. */
export type ResolvedConfig = {
  endpoint: string
  environment: string
  flagsEndpoint: string
  flushInterval: number
  maxBatchSize: number
  respectDNT: boolean
  siteDomain: string
  trackErrors: boolean
  trackPageViews: boolean
}

/** @internal */
export type SessionData = {
  id: string
  startedAt: number
}

/** @internal */
export type SessionPayload = {
  device: DeviceInfo
  environment: string
  referrer: null | string
  sessionId: string
  type: 'session'
  utmCampaign: null | string
  utmContent: null | string
  utmMedium: null | string
  utmSource: null | string
  utmTerm: null | string
}
