import { useEffect, useMemo, useState } from 'react'

import { analytics } from '../analytics'
import type { EventProperties, FlagValue, IdentifyProperties } from '../types'

/**
 * Access the analytics singleton with stable method references.
 * Methods are safe to destructure and pass as callbacks.
 *
 * @returns An object with `track`, `getFlag`, `identify`, `trackPageView`, and `destroy` methods.
 *
 * @example
 * ```tsx
 * import { useAnalytics } from '@imaxart/analytics/react'
 *
 * const MyComponent = () => {
 *   const { track } = useAnalytics()
 *
 *   return (
 *     <button onClick={() => track('cta_click', { variant: 'blue' })}>
 *       Click me
 *     </button>
 *   )
 * }
 * ```
 */
export const useAnalytics = () =>
  useMemo(
    () => ({
      destroy: analytics.destroy,
      getFlag: analytics.getFlag,
      identify: (properties: IdentifyProperties) => {
        analytics.identify(properties)
      },
      track: (event: string, properties?: EventProperties) => {
        analytics.track(event, properties)
      },
      trackPageView: (path: string) => {
        analytics.trackPageView(path)
      },
    }),
    [],
  )

/**
 * Subscribe to a feature flag value. Fetches the flag on mount and
 * re-renders the component when the value is resolved.
 *
 * @param key - The feature flag key to check.
 * @param defaultValue - Value to use while the flag is loading. Defaults to `false`.
 * @returns The current flag value.
 *
 * @example
 * ```tsx
 * import { useFeatureFlag } from '@imaxart/analytics/react'
 *
 * const Banner = () => {
 *   const showBanner = useFeatureFlag('promo-banner')
 *
 *   if (!showBanner) return null
 *   return <div>Special offer!</div>
 * }
 * ```
 */
export const useFeatureFlag = (
  key: string,
  defaultValue: FlagValue = false,
): FlagValue => {
  const [value, setValue] = useState<FlagValue>(defaultValue)

  useEffect(() => {
    let cancelled = false

    void analytics.getFlag(key).then((result) => {
      if (!cancelled) {
        setValue(result)
      }
    })

    return () => {
      cancelled = true
    }
  }, [key])

  return value
}
