import type { SessionData } from './types'

const SESSION_KEY = '_a_sid'

const generateId = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Returns current session from storage or creates and persists a new one.
 * @returns Session data (id, startedAt)
 */
export const getSession = (): SessionData => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY)

    if (stored) {
      return JSON.parse(stored) as SessionData
    }
  } catch {
    // sessionStorage unavailable or parse error
  }

  const session: SessionData = {
    id: generateId(),
    startedAt: Date.now(),
  }

  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // sessionStorage unavailable
  }

  return session
}
