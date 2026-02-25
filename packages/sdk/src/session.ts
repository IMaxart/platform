import type { SessionData } from './types'

const SESSION_KEY = '_ima_sid'

const generateId = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

/** @internal */
export const getOrCreateSession = (): SessionData => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)

    if (stored !== null) {
      return JSON.parse(stored) as SessionData
    }
  } catch {
    // [WHY]: sessionStorage may be unavailable (private browsing, iframe sandboxing)
    // or the stored value may be corrupted. Fall through to create a new session.
  }

  const session: SessionData = {
    id: generateId(),
    startedAt: Date.now(),
  }

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // [WHY]: sessionStorage unavailable -- session lives only in memory for this page.
  }

  return session
}
