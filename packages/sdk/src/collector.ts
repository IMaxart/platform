import type { CollectPayload, ResolvedConfig } from './types'

/** @internal */
export type Collector = {
  destroy: () => void
  enqueue: (payload: CollectPayload) => void
  flush: () => void
}

/** @internal */
export const createCollector = (config: ResolvedConfig): Collector => {
  const queue: CollectPayload[] = []
  let timer: null | ReturnType<typeof setTimeout> = null

  const send = () => {
    if (queue.length === 0) return

    const batch = queue.splice(0, config.maxBatchSize)
    const body = JSON.stringify(batch)

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(config.endpoint, body)
      return
    }

    fetch(config.endpoint, {
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      method: 'POST',
    }).catch(() => {
      // [WHY]: Analytics must never break the host application.
      // [WHEN]: This is intentional -- network failures are silently ignored.
    })
  }

  const enqueue = (payload: CollectPayload) => {
    queue.push(payload)

    if (queue.length >= config.maxBatchSize) {
      send()
      return
    }

    timer ??= setTimeout(() => {
      timer = null
      send()
    }, config.flushInterval)
  }

  const flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    send()
  }

  const destroy = () => {
    flush()
    queue.length = 0
  }

  return { destroy, enqueue, flush }
}
