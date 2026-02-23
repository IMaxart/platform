import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<300'],
    http_req_failed: ['rate<0.05'],
  },
}

export default function () {
  const flagKey = `test-flag-${Math.floor(Math.random() * 5)}`
  const sid = `k6-session-${Math.floor(Math.random() * 100)}`

  const res = http.get(`${BASE_URL}/api/flags?key=${flagKey}&sid=${sid}`)

  check(res, {
    'status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'response time < 100ms': (r) => r.timings.duration < 100,
  })

  sleep(0.05)
}
