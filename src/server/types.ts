export type ProbeKind = "internal" | "public";

export type EndpointInternalMode = "directUrl" | "traefikHost";

export type EndpointHttpMethod = "GET" | "HEAD";

export type CheckState = "UP" | "DEGRADED" | "DOWN" | "UNKNOWN";

export type ServiceRow = {
  id: string;
  slug: string;
  name: string;
  primaryDomain: string | null;
  publicStatusHost: string;
  enabled: 0 | 1;
  createdAtMs: number;
};

export type EndpointRow = {
  id: string;
  serviceId: string;
  key: string;
  displayName: string;
  internalMode: EndpointInternalMode;
  internalUrl: string | null;
  internalHost: string | null;
  internalPath: string;
  publicUrl: string | null;
  method: EndpointHttpMethod;
  intervalSec: number;
  timeoutMs: number;
  warnMs: number;
  degradedMs: number;
  expectedStatusMin: number;
  expectedStatusMax: number;
  enabled: 0 | 1;
  createdAtMs: number;
};

export type CheckRow = {
  id: string;
  endpointId: string;
  probe: ProbeKind;
  atMs: number;
  ok: 0 | 1;
  degraded: 0 | 1;
  statusCode: number | null;
  latencyMs: number | null;
  errorKind: string | null;
  errorMessage: string | null;
};

export type InternetCheckRow = {
  id: string;
  atMs: number;
  ok: 0 | 1;
  latencyMs: number | null;
  errorKind: string | null;
  errorMessage: string | null;
};

export type DailyRollupRow = {
  endpointId: string;
  probe: ProbeKind;
  dayStartMs: number;
  total: number;
  up: number;
  degraded: number;
  down: number;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
};
