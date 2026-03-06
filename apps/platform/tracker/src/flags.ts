const flagCache = new Map<string, { expiresAt: number; value: boolean }>()
const FLAG_CACHE_TTL = 5 * 60 * 1000

/**
 * Fetches a feature flag value (cached 5 min) from the flags API.
 * @param endpoint - API collect endpoint URL (used to derive flags URL)
 * @param key - Flag key to look up
 * @param sessionId - Current session identifier
 * @returns Promise resolving to the flag boolean (false on error or disabled)
 */
export const getFlag = async ({
  dataDomain,
  endpoint,
  key,
  sessionId,
}: {
  dataDomain: null | string
  endpoint: string
  key: string
  sessionId: string
}): Promise<boolean> => {
  const cached = flagCache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value
  }

  try {
    const flagUrl = endpoint.replace('/api/collect', '/api/flags')
    const params = new URLSearchParams({
      key,
      sid: sessionId,
    })
    if (dataDomain !== null) {
      params.set('domain', dataDomain)
    }
    const response = await fetch(`${flagUrl}?${params.toString()}`)

    if (!response.ok) return false

    const data = (await response.json()) as { enabled: boolean }
    const value = data.enabled

    flagCache.set(key, { expiresAt: Date.now() + FLAG_CACHE_TTL, value })
    return value
  } catch {
    return false
  }
}
