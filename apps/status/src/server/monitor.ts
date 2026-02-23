import type { Db } from "./db";
import type { Env } from "./env";
import { named } from "./sql";
import type { CheckRow, DailyRollupRow, EndpointRow, ProbeKind } from "./types";

type InternetState = {
  ok: boolean;
  checkedAtMs: number;
};

const sleep = async ({ ms }: { ms: number }) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const clampErrorMessage = ({ message }: { message: string }) => {
  if (message.length <= 500) return message;
  return `${message.slice(0, 500)}…`;
};

const getDayStartUtcMs = ({ atMs }: { atMs: number }) => {
  const d = new Date(atMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

const p95 = ({ values }: { values: number[] }) => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))] ?? null;
};

const toErrorKind = ({ error }: { error: unknown }) => {
  if (error instanceof DOMException && error.name === "AbortError")
    return "timeout";
  if (error instanceof Error) return "fetch_error";
  return "unknown";
};

type ProbeResult = {
  ok: boolean;
  degraded: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  errorKind: string | null;
  errorMessage: string | null;
};

const probeUrl = async ({
  url,
  method,
  headers,
  timeoutMs,
}: {
  url: string;
  method: "GET" | "HEAD";
  headers: HeadersInit;
  timeoutMs: number;
}): Promise<ProbeResult> => {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      signal: controller.signal,
      cache: "no-store",
    });

    void res.body?.cancel();

    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));
    return {
      ok: true,
      degraded: false,
      statusCode: res.status,
      latencyMs,
      errorKind: null,
      errorMessage: null,
    };
  } catch (error) {
    const latencyMs = Math.max(0, Math.round(performance.now() - startedAt));

    return {
      ok: false,
      degraded: false,
      statusCode: null,
      latencyMs,
      errorKind: toErrorKind({ error }),
      errorMessage:
        error instanceof Error
          ? clampErrorMessage({ message: error.message })
          : "Unknown error",
    };
  } finally {
    clearTimeout(timer);
  }
};

const resolveEndpointProbeTarget = ({
  endpoint,
  env,
  probe,
}: {
  endpoint: EndpointRow;
  env: Env;
  probe: ProbeKind;
}) => {
  if (probe === "public") {
    if (!endpoint.publicUrl) return null;
    const headers: Record<string, string> = {};
    return {
      url: endpoint.publicUrl,
      headers,
    };
  }

  if (endpoint.internalMode === "directUrl") {
    if (!endpoint.internalUrl) return null;
    const headers: Record<string, string> = {};
    return {
      url: endpoint.internalUrl,
      headers,
    };
  }

  const host = endpoint.internalHost;
  if (!host) return null;

  const base = new URL(env.internalTraefikBaseUrl);
  base.pathname = endpoint.internalPath;
  base.search = "";
  base.hash = "";

  return {
    url: base.toString(),
    headers: {
      // This is allowed in server-side fetch and enables Host-based routing via Traefik.
      host,
    },
  };
};

const isExpectedStatus = ({
  status,
  expectedStatusMin,
  expectedStatusMax,
}: {
  status: number;
  expectedStatusMin: number;
  expectedStatusMax: number;
}) => {
  return status >= expectedStatusMin && status <= expectedStatusMax;
};

const computeDayRollup = ({
  rows,
  dayStartMs,
  endpointId,
  probe,
}: {
  rows: { ok: 0 | 1; degraded: 0 | 1; latencyMs: number | null }[];
  dayStartMs: number;
  endpointId: string;
  probe: ProbeKind;
}): DailyRollupRow => {
  const total = rows.length;
  const up = rows.filter((r) => r.ok === 1).length;
  const degraded = rows.filter((r) => r.ok === 1 && r.degraded === 1).length;
  const down = total - up;

  const okLatencies = rows
    .filter((r) => r.ok === 1 && typeof r.latencyMs === "number")
    .map((r) => r.latencyMs)
    .filter((v): v is number => typeof v === "number");

  const avgLatencyMs =
    okLatencies.length === 0
      ? null
      : okLatencies.reduce((acc, v) => acc + v, 0) / okLatencies.length;

  return {
    endpointId,
    probe,
    dayStartMs,
    total,
    up,
    degraded,
    down,
    avgLatencyMs:
      avgLatencyMs === null ? null : Number(avgLatencyMs.toFixed(2)),
    p95LatencyMs: p95({ values: okLatencies }),
  };
};

const getAdminSafeNowMs = () => Date.now();

export const startMonitoring = ({ db, env }: { db: Db; env: Env }) => {
  const state: {
    internet: InternetState | null;
    endpoints: EndpointRow[];
    nextRunAtByEndpointId: Map<string, number>;
  } = {
    internet: null,
    endpoints: [],
    nextRunAtByEndpointId: new Map(),
  };

  const refreshEndpoints = () => {
    const endpoints = db.listActiveEndpoints();
    state.endpoints = endpoints;

    for (const e of endpoints) {
      if (!state.nextRunAtByEndpointId.has(e.id)) {
        state.nextRunAtByEndpointId.set(e.id, 0);
      }
    }
  };

  const runInternetProbe = async ({ nowMs }: { nowMs: number }) => {
    const last = state.internet;
    const isDue =
      last === null ||
      nowMs - last.checkedAtMs >= env.internetIntervalSec * 1000;
    if (!isDue) return last;

    const result = await probeUrl({
      url: env.internetCheckUrl,
      method: "HEAD",
      headers: {},
      timeoutMs: 3000,
    });

    const ok =
      result.ok && result.statusCode !== null && result.statusCode < 500;

    db.insertInternetCheck({
      check: {
        id: crypto.randomUUID(),
        atMs: nowMs,
        ok: ok ? 1 : 0,
        latencyMs: result.latencyMs,
        errorKind: result.errorKind,
        errorMessage: result.errorMessage,
      },
    });

    const next = { ok, checkedAtMs: nowMs };
    state.internet = next;
    return next;
  };

  const runEndpointProbe = async ({
    endpoint,
    probe,
    nowMs,
    internetOk,
  }: {
    endpoint: EndpointRow;
    probe: ProbeKind;
    nowMs: number;
    internetOk: boolean;
  }) => {
    if (probe === "public" && !internetOk) return;

    const target = resolveEndpointProbeTarget({ endpoint, env, probe });
    if (!target) return;

    const result = await probeUrl({
      url: target.url,
      method: endpoint.method,
      headers: target.headers,
      timeoutMs: endpoint.timeoutMs,
    });

    const ok =
      result.ok &&
      typeof result.statusCode === "number" &&
      isExpectedStatus({
        status: result.statusCode,
        expectedStatusMin: endpoint.expectedStatusMin,
        expectedStatusMax: endpoint.expectedStatusMax,
      });

    const degraded =
      ok &&
      typeof result.latencyMs === "number" &&
      result.latencyMs >= endpoint.degradedMs;

    const check: CheckRow = {
      id: crypto.randomUUID(),
      endpointId: endpoint.id,
      probe,
      atMs: nowMs,
      ok: ok ? 1 : 0,
      degraded: degraded ? 1 : 0,
      statusCode: result.statusCode,
      latencyMs: result.latencyMs,
      errorKind: ok ? null : result.errorKind,
      errorMessage: ok ? null : result.errorMessage,
    };

    db.insertCheck({ check });
  };

  const runMaintenance = ({ nowMs }: { nowMs: number }) => {
    const retentionMs = env.checksRetentionHours * 60 * 60 * 1000;
    db.deleteChecksBefore({ beforeMs: nowMs - retentionMs });

    // We only keep raw checks for ~48h, so we continuously upsert daily rollups
    // for today and yesterday before old raw checks are deleted.
    const todayStart = getDayStartUtcMs({ atMs: nowMs });
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

    const recomputeDay = ({ dayStartMs }: { dayStartMs: number }) => {
      const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000;
      const byKey = new Map<
        string,
        {
          endpointId: string;
          probe: ProbeKind;
          rows: { ok: 0 | 1; degraded: 0 | 1; latencyMs: number | null }[];
        }
      >();

      const stmt2 = db.sqlite.prepare(`
        SELECT endpointId, probe, ok, degraded, latencyMs
        FROM checks
        WHERE atMs >= $dayStartMs AND atMs < $dayEndMs
      `);
      const rows2 = stmt2.all(named({ dayStartMs, dayEndMs })) as {
        endpointId: string;
        probe: ProbeKind;
        ok: 0 | 1;
        degraded: 0 | 1;
        latencyMs: number | null;
      }[];

      for (const r of rows2) {
        const key = `${r.endpointId}:${r.probe}`;
        const prev = byKey.get(key);
        const nextRows = prev?.rows ?? [];
        nextRows.push({
          ok: r.ok,
          degraded: r.degraded,
          latencyMs: r.latencyMs,
        });

        byKey.set(key, {
          endpointId: r.endpointId,
          probe: r.probe,
          rows: nextRows,
        });
      }

      for (const entry of byKey.values()) {
        const rollup = computeDayRollup({
          rows: entry.rows,
          dayStartMs,
          endpointId: entry.endpointId,
          probe: entry.probe,
        });
        db.upsertDailyRollup({ rollup });
      }
    };

    recomputeDay({ dayStartMs: yesterdayStart });
    recomputeDay({ dayStartMs: todayStart });
  };

  let isTickRunning = false;
  const tick = async () => {
    // Avoid overlapping ticks if probes are slow.
    if (isTickRunning) return;
    isTickRunning = true;
    try {
      const nowMs = getAdminSafeNowMs();
      const internet = await runInternetProbe({ nowMs });
      const internetOk = internet?.ok ?? false;

      for (const endpoint of state.endpoints) {
        const nextRunAt = state.nextRunAtByEndpointId.get(endpoint.id) ?? 0;
        if (nowMs < nextRunAt) continue;

        state.nextRunAtByEndpointId.set(
          endpoint.id,
          nowMs + endpoint.intervalSec * 1000
        );

        await runEndpointProbe({
          endpoint,
          probe: "internal",
          nowMs,
          internetOk,
        });

        await runEndpointProbe({
          endpoint,
          probe: "public",
          nowMs,
          internetOk,
        });

        await sleep({ ms: 5 });
      }
    } finally {
      isTickRunning = false;
    }
  };

  const start = () => {
    refreshEndpoints();
    setInterval(refreshEndpoints, 30_000);

    tick().catch((error) => {
      void error;
    });
    setInterval(() => {
      tick().catch((error) => {
        void error;
      });
    }, 1_000);

    const runMaintenanceTick = () => {
      const nowMs = getAdminSafeNowMs();
      try {
        runMaintenance({ nowMs });
      } catch (error) {
        void error;
      }
    };
    runMaintenanceTick();
    setInterval(runMaintenanceTick, env.maintenanceIntervalSec * 1000);
  };

  start();
};
