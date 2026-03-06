export type CheckRow = {
  atMs: number
  degraded: 0 | 1
  endpointId: string
  errorKind: null | string
  errorMessage: null | string
  id: string
  latencyMs: null | number
  ok: 0 | 1
  probe: ProbeKind
  statusCode: null | number
}

export type CheckState = 'DEGRADED' | 'DOWN' | 'UNKNOWN' | 'UP'

export type DailyRollupRow = {
  avgLatencyMs: null | number
  dayStartMs: number
  degraded: number
  down: number
  endpointId: string
  p95LatencyMs: null | number
  probe: ProbeKind
  total: number
  up: number
}

export type EndpointHttpMethod = 'GET' | 'HEAD'

export type EndpointInternalMode = 'directUrl' | 'traefikHost'

export type EndpointRow = {
  createdAtMs: number
  degradedMs: number
  displayName: string
  enabled: 0 | 1
  expectedStatusMax: number
  expectedStatusMin: number
  id: string
  internalHost: null | string
  internalMode: EndpointInternalMode
  internalPath: string
  internalUrl: null | string
  intervalSec: number
  key: string
  method: EndpointHttpMethod
  publicLabel: null | string
  publicUrl: null | string
  serviceId: string
  timeoutMs: number
  warnMs: number
}

export type InternetCheckRow = {
  atMs: number
  errorKind: null | string
  errorMessage: null | string
  id: string
  latencyMs: null | number
  ok: 0 | 1
}

export type ProbeKind = 'internal' | 'public'

export type ServiceRow = {
  createdAtMs: number
  enabled: 0 | 1
  id: string
  name: string
  primaryDomain: null | string
  publicStatusHost: null | string
  slug: string
}
