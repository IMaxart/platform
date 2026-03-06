import type { CollectPayload, TrackerConfig } from './types'

const queue: CollectPayload[] = []
let timer: null | ReturnType<typeof setTimeout> = null

const buildUrl = (config: TrackerConfig): string => {
  if (config.dataDomain === null) return config.endpoint
  return `${config.endpoint}?domain=${encodeURIComponent(config.dataDomain)}`
}

const send = (config: TrackerConfig) => {
  if (queue.length === 0) return

  const batch = queue.splice(0, config.maxBatchSize)
  const body = JSON.stringify(batch)
  const url = buildUrl(config)

  const sent = navigator.sendBeacon(url, body)
  if (sent) return

  fetch(url, {
    body,
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    method: 'POST',
  }).catch(() => {
    // silently fail
  })
}

/**
 * Queues a payload and flushes when batch is full or flush interval elapses.
 * @param payload - Collect payload to queue
 * @param config - Tracker config (endpoint, maxBatchSize, flushInterval)
 * @returns {void}
 */
export const enqueue = (payload: CollectPayload, config: TrackerConfig) => {
  queue.push(payload)

  if (queue.length >= config.maxBatchSize) {
    send(config)
    return
  }

  timer ??= setTimeout(() => {
    timer = null
    send(config)
  }, config.flushInterval)
}

/**
 * Immediately sends all queued payloads to the endpoint.
 * @param config - Tracker config with endpoint URL
 * @returns {void}
 */
export const flush = (config: TrackerConfig) => {
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  send(config)
}
