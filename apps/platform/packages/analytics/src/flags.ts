import type { FlagValue } from './types'

const FLAG_CACHE_TTL = 5 * 60 * 1000

/** @internal */
export type FlagClient = {
  destroy: () => void
  getFlag: (key: string) => Promise<FlagValue>
}

/** @internal */
export const createFlagClient = ({
  flagsEndpoint,
  sessionId,
}: {
  flagsEndpoint: string
  sessionId: string
}): FlagClient => {
  const cache = new Map<string, { expiresAt: number; value: FlagValue }>()

  const getFlag = async (key: string): Promise<FlagValue> => {
    const cached = cache.get(key)

    if (cached && cached.expiresAt > Date.now()) {
      return cached.value
    }

    try {
      const url = `${flagsEndpoint}?key=${encodeURIComponent(key)}&sid=${encodeURIComponent(sessionId)}`
      const response = await fetch(url)

      if (response.status === 404) {
        console.warn(
          `[IMaxart Analytics] Flag "${key}" not found in project. Returning false. Make sure this flag is defined in your analytics dashboard.`,
        )
        return false
      }

      if (!response.ok) return false

      const data = (await response.json()) as { enabled: boolean }
      const value = data.enabled

      cache.set(key, { expiresAt: Date.now() + FLAG_CACHE_TTL, value })
      return value
    } catch {
      return false
    }
  }

  const destroy = () => {
    cache.clear()
  }

  return { destroy, getFlag }
}
