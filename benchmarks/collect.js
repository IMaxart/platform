import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 100 },
    { duration: '30s', target: 100 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'],
    http_req_failed: ['rate<0.01'],
  },
}

const sessionPayload = JSON.stringify([
  {
    type: 'session',
    sessionId: `k6-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    environment: 'production',
    referrer: null,
    device: {
      browserName: 'Chrome',
      browserVersion: '120.0',
      osName: 'macOS',
      osVersion: '14.2',
      deviceType: 'desktop',
      language: 'en-US',
      screenWidth: 1920,
      screenHeight: 1080,
      timezone: 'Europe/Warsaw',
    },
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
  },
])

export default function () {
  const res = http.post(`${BASE_URL}/api/collect`, sessionPayload, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-load-test/1.0',
    },
  })

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  })

  sleep(0.1)
}
