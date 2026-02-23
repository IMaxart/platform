# @imaxart/analytics

[![npm version](https://img.shields.io/npm/v/@imaxart/analytics.svg)](https://www.npmjs.com/package/@imaxart/analytics)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@imaxart/analytics)](https://bundlephobia.com/package/@imaxart/analytics)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Privacy-first analytics SDK for web applications. Lightweight, strongly typed, framework-agnostic core with optional React utilities.

## Installation

```bash
pnpm add @imaxart/analytics
# or
npm install @imaxart/analytics
# or
yarn add @imaxart/analytics
```

## Quick Start

```typescript
import { analytics } from '@imaxart/analytics'

analytics.init({
  domain: 'analytics.example.com',
})

// Track custom events
analytics.track('signup_click', { plan: 'pro' })

// Feature flags
const enabled = await analytics.getFlag('new-feature')

// Device identification (for dashboard exclusion)
analytics.identify({ name: 'Developer Laptop' })

// Cleanup
analytics.destroy()
```

## API Reference

### `analytics.init(config)`

Initialize the analytics client. Must be called before any other method. Safe to call in SSR -- silently no-ops when `window` is unavailable.

```typescript
type AnalyticsConfig = {
  /** Analytics subdomain. Required. */
  domain: string
  /** Auto-track page views via History API. @default true */
  trackPageViews?: boolean
  /** Capture console errors and unhandled rejections. @default true */
  trackErrors?: boolean
  /** Respect browser Do Not Track setting. @default true */
  respectDNT?: boolean
  /** Max events per batch. @default 10 */
  maxBatchSize?: number
  /** Flush interval in ms. @default 5000 */
  flushInterval?: number
}
```

### `analytics.track(event, properties?)`

Track a custom event.

```typescript
analytics.track('purchase', {
  productId: 'SKU-123',
  price: 29.99,
  currency: 'USD',
})
```

### `analytics.getFlag(key)`

Get a feature flag value. Results are cached for 5 minutes.

```typescript
const enabled = await analytics.getFlag('dark-mode-v2')
```

### `analytics.identify(properties)`

Tag the current device for exclusion from analytics statistics.

```typescript
analytics.identify({ name: 'My Dev Machine' })
```

### `analytics.trackPageView(path)`

Manually track a page view. Use when `trackPageViews: false` with a framework adapter.

### `analytics.destroy()`

Flush pending events and clean up all listeners.

## React Utilities

Import from `@imaxart/analytics/react`:

```typescript
import {
  enableTanStackRouterTracking,
  useAnalytics,
  useFeatureFlag,
  useNextPageTracking,
} from '@imaxart/analytics/react'
```

### `useAnalytics()`

Access the analytics singleton with stable method references.

```tsx
const { track, getFlag } = useAnalytics()

<button onClick={() => track('click', { id: 'cta' })}>Click</button>
```

### `useFeatureFlag(key, defaultValue?)`

Subscribe to a feature flag. Re-renders when the value resolves.

```tsx
const showBanner = useFeatureFlag('promo-banner')
if (showBanner) return <Banner />
```

### `enableTanStackRouterTracking(router)`

Page view tracking for TanStack Router. Set `trackPageViews: false` in init.

```typescript
analytics.init({ domain: '...', trackPageViews: false })
const cleanup = enableTanStackRouterTracking(router)
```

### `useNextPageTracking(pathname)`

Page view tracking for Next.js App Router. Pass `usePathname()` result.

```tsx
const pathname = usePathname()
useNextPageTracking(pathname)
```

## Multiple Instances

For advanced use cases, instantiate the `Analytics` class directly:

```typescript
import { Analytics } from '@imaxart/analytics'

const tracker = new Analytics()
tracker.init({ domain: 'analytics.site-a.com' })
```

## TypeScript

All types are exported:

```typescript
import type {
  AnalyticsConfig,
  EventProperties,
  FlagValue,
  IdentifyProperties,
} from '@imaxart/analytics'
```

## License

[MIT](LICENSE)
