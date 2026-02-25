import { enqueue } from './collector'
import type { ErrorPayload, TrackerConfig } from './types'

/**
 * Attaches handlers for uncaught errors, unhandled rejections, and console.error/warn.
 * @param config - Tracker config for enqueue
 * @param sessionId - Current session identifier
 * @returns {void}
 */
export const initErrorTracking = ({
  config,
  sessionId,
}: {
  config: TrackerConfig
  sessionId: string
}) => {
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args: unknown[]) => {
    captureConsole({ args, config, level: 'error', sessionId })
    originalError.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    captureConsole({ args, config, level: 'warning', sessionId })
    originalWarn.apply(console, args)
  }

  window.addEventListener('error', (event) => {
    const payload: ErrorPayload = {
      columnNumber: event.colno || null,
      level: 'error',
      lineNumber: event.lineno || null,
      message: event.message || 'Unknown error',
      path: window.location.pathname + window.location.search,
      sessionId,
      sourceUrl: event.filename || null,
      stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
      type: 'error',
    }

    enqueue(payload, config)
  })

  window.addEventListener('unhandledrejection', (event) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason)

    const stack =
      event.reason instanceof Error ? (event.reason.stack ?? null) : null

    const payload: ErrorPayload = {
      columnNumber: null,
      level: 'error',
      lineNumber: null,
      message: `Unhandled Promise Rejection: ${message}`,
      path: window.location.pathname + window.location.search,
      sessionId,
      sourceUrl: null,
      stack,
      type: 'error',
    }

    enqueue(payload, config)
  })
}

const captureConsole = ({
  args,
  config,
  level,
  sessionId,
}: {
  args: unknown[]
  config: TrackerConfig
  level: 'error' | 'warning'
  sessionId: string
}) => {
  const message = args
    .map((a) => {
      if (typeof a === 'string') return a
      try {
        return JSON.stringify(a)
      } catch {
        return String(a)
      }
    })
    .join(' ')

  const payload: ErrorPayload = {
    columnNumber: null,
    level,
    lineNumber: null,
    message: message.slice(0, 2000),
    path: window.location.pathname + window.location.search,
    sessionId,
    sourceUrl: null,
    stack: null,
    type: 'error',
  }

  enqueue(payload, config)
}
