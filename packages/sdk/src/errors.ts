import type { ErrorPayload } from './types'

/** @internal */
export type ErrorTracker = {
  destroy: () => void
}

/** @internal */
export const createErrorTracker = ({
  onPayload,
  sessionId,
}: {
  onPayload: (payload: ErrorPayload) => void
  sessionId: string
}): ErrorTracker => {
  const originalError = console.error
  const originalWarn = console.warn

  const captureConsole = ({
    args,
    level,
  }: {
    args: unknown[]
    level: 'error' | 'warning'
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

    onPayload({
      columnNumber: null,
      level,
      lineNumber: null,
      message: message.slice(0, 2000),
      path: window.location.pathname + window.location.search,
      sessionId,
      sourceUrl: null,
      stack: null,
      type: 'error',
    })
  }

  console.error = (...args: unknown[]) => {
    captureConsole({ args, level: 'error' })
    originalError.apply(console, args)
  }

  console.warn = (...args: unknown[]) => {
    captureConsole({ args, level: 'warning' })
    originalWarn.apply(console, args)
  }

  const onError = (event: ErrorEvent) => {
    onPayload({
      columnNumber: event.colno || null,
      level: 'error',
      lineNumber: event.lineno || null,
      message: event.message || 'Unknown error',
      path: window.location.pathname + window.location.search,
      sessionId,
      sourceUrl: event.filename || null,
      stack: event.error instanceof Error ? (event.error.stack ?? null) : null,
      type: 'error',
    })
  }

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const message =
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason)

    const stack =
      event.reason instanceof Error ? (event.reason.stack ?? null) : null

    onPayload({
      columnNumber: null,
      level: 'error',
      lineNumber: null,
      message: `Unhandled Promise Rejection: ${message}`,
      path: window.location.pathname + window.location.search,
      sessionId,
      sourceUrl: null,
      stack,
      type: 'error',
    })
  }

  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)

  const destroy = () => {
    console.error = originalError
    console.warn = originalWarn
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onUnhandledRejection)
  }

  return { destroy }
}
