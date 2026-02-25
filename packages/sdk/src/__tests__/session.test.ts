import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getOrCreateSession } from '../session'

describe('getOrCreateSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('creates a new session with a valid hex id', () => {
    const session = getOrCreateSession()

    expect(session.id).toMatch(/^[0-9a-f]{32}$/)
    expect(session.startedAt).toBeTypeOf('number')
    expect(session.startedAt).toBeLessThanOrEqual(Date.now())
  })

  it('returns the same session on subsequent calls', () => {
    const first = getOrCreateSession()
    const second = getOrCreateSession()

    expect(first.id).toBe(second.id)
    expect(first.startedAt).toBe(second.startedAt)
  })

  it('persists session to sessionStorage', () => {
    const session = getOrCreateSession()
    const stored = sessionStorage.getItem('_ima_sid')

    expect(stored).not.toBeNull()

    const parsed = JSON.parse(stored ?? '{}') as {
      id: string
      startedAt: number
    }
    expect(parsed.id).toBe(session.id)
  })

  it('creates a new session after storage is cleared', () => {
    const first = getOrCreateSession()
    sessionStorage.clear()
    const second = getOrCreateSession()

    expect(second.id).not.toBe(first.id)
  })

  it('handles corrupted storage gracefully', () => {
    sessionStorage.setItem('_ima_sid', 'not-valid-json')
    const session = getOrCreateSession()

    expect(session.id).toMatch(/^[0-9a-f]{32}$/)
  })
})
