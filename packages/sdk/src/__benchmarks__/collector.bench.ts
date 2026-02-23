import { bench, describe } from 'vitest'

import type { ResolvedConfig } from '../types'

import { createCollector } from '../collector'

const config: ResolvedConfig = {
  endpoint: 'https://localhost/api/collect',
  environment: 'production',
  flagsEndpoint: 'https://localhost/api/flags',
  flushInterval: 5000,
  maxBatchSize: 20,
  respectDNT: false,
  trackErrors: true,
  trackPageViews: true,
}

describe('collector batching throughput', () => {
  bench('enqueue single payload', () => {
    const collector = createCollector(config)
    collector.enqueue({
      durationMs: null,
      enteredAt: Date.now(),
      path: '/',
      referrer: null,
      scrollDepthPct: null,
      sessionId: 'bench-session',
      title: 'Home',
      type: 'pageview',
    })
    collector.destroy()
  })

  bench('enqueue 50 payloads', () => {
    const collector = createCollector(config)
    for (let i = 0; i < 50; i++) {
      collector.enqueue({
        durationMs: null,
        enteredAt: Date.now(),
        path: `/${i}`,
        referrer: null,
        scrollDepthPct: null,
        sessionId: 'bench-session',
        title: `Page ${i}`,
        type: 'pageview',
      })
    }
    collector.destroy()
  })
})
