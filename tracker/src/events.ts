import type { EventPayload, TrackerConfig } from './types'

import { enqueue } from './collector'

/**
 * Queues a custom event with optional properties for collection.
 * @param config - Tracker config for enqueue
 * @param name - Event name
 * @param properties - Optional key-value event data
 * @param sessionId - Current session identifier
 * @returns {void}
 */
export const trackEvent = ({
  config,
  name,
  properties,
  sessionId,
}: {
  config: TrackerConfig
  name: string
  properties?: Record<string, unknown>
  sessionId: string
}) => {
  const payload: EventPayload = {
    name,
    path: window.location.pathname + window.location.search,
    properties: properties ?? null,
    sessionId,
    type: 'event',
  }

  enqueue(payload, config)
}
