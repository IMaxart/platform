import type {
  AdminServicesResponse,
  DokployRefType,
  PublicPageResponse,
} from "~/shared/api-types";

import type { Db } from "./db";
import type { Env } from "./env";
import { named } from "./sql";
import type { CheckState, EndpointRow, ProbeKind, ServiceRow } from "./types";

const json = (body: unknown, init?: ResponseInit) => {
  return Response.json(body, init);
};

const getRequestHost = ({ req }: { req: Request }) => {
  const forwarded = req.headers.get("x-forwarded-host");
  const host = forwarded ?? req.headers.get("host");
  return host?.split(",")[0]?.trim() ?? null;
};

const isLocalhostHost = ({ host }: { host: string }) => {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("0.0.0.0")
  );
};

const requireAdminToken = ({ req, env }: { req: Request; env: Env }) => {
  const expected = env.adminWriteToken;
  if (!expected)
    return { ok: false, error: "ADMIN_WRITE_TOKEN not configured" as const };

  const provided = req.headers.get("x-admin-token");
  if (provided !== expected)
    return { ok: false, error: "Invalid admin token" as const };

  return { ok: true as const };
};

const endpointStateFromLatest = ({
  latest,
}: {
  latest: { ok: 0 | 1; degraded: 0 | 1 } | null;
}): CheckState => {
  if (!latest) return "UNKNOWN";
  if (latest.ok === 0) return "DOWN";
  if (latest.degraded === 1) return "DEGRADED";
  return "UP";
};

const serviceStateFromEndpoints = ({
  endpointStates,
}: {
  endpointStates: CheckState[];
}): CheckState => {
  if (endpointStates.includes("DOWN")) return "DOWN";
  if (endpointStates.includes("DEGRADED")) return "DEGRADED";
  if (endpointStates.includes("UP")) return "UP";
  return "UNKNOWN";
};

type PublicModeResponse = Extract<PublicPageResponse, { mode: "public" }>;

const getUptimePercent = ({ up, total }: { up: number; total: number }) => {
  if (total === 0) return null;
  return Number(((up / total) * 100).toFixed(3));
};

const computeUptimeFromChecks = ({
  db,
  endpointId,
  probe,
  sinceMs,
}: {
  db: Db;
  endpointId: string;
  probe: ProbeKind;
  sinceMs: number;
}) => {
  const stmt = db.sqlite.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN ok = 1 THEN 1 ELSE 0 END) as up
    FROM checks
    WHERE endpointId = $endpointId AND probe = $probe AND atMs >= $sinceMs
  `);
  const row = stmt.get(named({ endpointId, probe, sinceMs })) as {
    total: number;
    up: number;
  } | null;
  if (!row) return null;
  return getUptimePercent({ up: row.up ?? 0, total: row.total ?? 0 });
};

const computeUptimeFromDailyRollups = ({
  db,
  endpointId,
  probe,
  sinceMs,
}: {
  db: Db;
  endpointId: string;
  probe: ProbeKind;
  sinceMs: number;
}) => {
  const rollups = db.getDailyRollups({ endpointId, probe, sinceMs });
  const total = rollups.reduce((acc, r) => acc + r.total, 0);
  const up = rollups.reduce((acc, r) => acc + r.up, 0);
  return getUptimePercent({ up, total });
};

const computeServiceUptimeFromChecks = ({
  db,
  serviceId,
  probe,
  sinceMs,
}: {
  db: Db;
  serviceId: string;
  probe: ProbeKind;
  sinceMs: number;
}) => {
  const stmt = db.sqlite.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN c.ok = 1 THEN 1 ELSE 0 END) as up
    FROM checks c
    JOIN endpoints e ON e.id = c.endpointId
    WHERE e.serviceId = $serviceId AND c.probe = $probe AND c.atMs >= $sinceMs
  `);

  const row = stmt.get(named({ serviceId, probe, sinceMs })) as {
    total: number;
    up: number;
  } | null;
  if (!row) return null;
  return getUptimePercent({ up: row.up ?? 0, total: row.total ?? 0 });
};

const computeServiceUptimeFromDailyRollups = ({
  db,
  serviceId,
  probe,
  sinceMs,
}: {
  db: Db;
  serviceId: string;
  probe: ProbeKind;
  sinceMs: number;
}) => {
  const stmt = db.sqlite.prepare(`
    SELECT
      SUM(r.total) as total,
      SUM(r.up) as up
    FROM rollups_daily r
    JOIN endpoints e ON e.id = r.endpointId
    WHERE e.serviceId = $serviceId AND r.probe = $probe AND r.dayStartMs >= $sinceMs
  `);
  const row = stmt.get(named({ serviceId, probe, sinceMs })) as {
    total: number;
    up: number;
  } | null;
  if (!row) return null;
  return getUptimePercent({ up: row.up ?? 0, total: row.total ?? 0 });
};

export const handleApiRequest = async ({
  req,
  db,
  env,
}: {
  req: Request;
  db: Db;
  env: Env;
}): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const host = getRequestHost({ req });
    if (!host) return json({ error: "Missing Host header" }, { status: 400 });

    if (url.pathname === "/api/public/page" && req.method === "GET") {
      const isAdminHost = host === env.adminHost || isLocalhostHost({ host });
      if (isAdminHost) {
        const resp: PublicPageResponse = {
          mode: "admin",
          host,
          adminHost: env.adminHost,
        };
        return json(resp);
      }

      const service = db.getServiceByPublicHost({ host });
      if (!service) {
        const resp: PublicPageResponse = {
          mode: "notFound",
          host,
          adminHost: env.adminHost,
        };
        return json(resp, { status: 404 });
      }

      const endpoints = db
        .listEndpointsByServiceId({ serviceId: service.id })
        .filter((e) => e.enabled === 1);

      const nowMs = Date.now();
      const since24hMs = nowMs - 24 * 60 * 60 * 1000;
      const since90dMs = nowMs - 90 * 24 * 60 * 60 * 1000;
      const since365dMs = nowMs - 365 * 24 * 60 * 60 * 1000;

      const checks24hByEndpointId: PublicModeResponse["checks24hByEndpointId"] =
        Object.fromEntries(
          endpoints.map((e) => [
            e.id,
            db
              .listChecksSince({
                endpointId: e.id,
                probe: "internal",
                sinceMs: since24hMs,
              })
              .map((c) => ({
                atMs: c.atMs,
                ok: c.ok,
                degraded: c.degraded,
                latencyMs: c.latencyMs,
              })),
          ])
        );

      const endpointsWithStatus = endpoints.map((e) => {
        const latest = db.getLatestCheck({
          endpointId: e.id,
          probe: "internal",
        });
        const state = endpointStateFromLatest({ latest });

        const uptimeLast24h = computeUptimeFromChecks({
          db,
          endpointId: e.id,
          probe: "internal",
          sinceMs: since24hMs,
        });
        const uptimeLast90d = computeUptimeFromDailyRollups({
          db,
          endpointId: e.id,
          probe: "internal",
          sinceMs: since90dMs,
        });
        const uptimeLast365d = computeUptimeFromDailyRollups({
          db,
          endpointId: e.id,
          probe: "internal",
          sinceMs: since365dMs,
        });

        return {
          ...e,
          latest: latest
            ? {
                atMs: latest.atMs,
                state,
                statusCode: latest.statusCode,
                latencyMs: latest.latencyMs,
                errorKind: latest.errorKind,
              }
            : null,
          uptime: {
            last24h: uptimeLast24h,
            last90d: uptimeLast90d,
            last365d: uptimeLast365d,
          },
        };
      });

      const endpointStates = endpointsWithStatus.map(
        (e) => e.latest?.state ?? "UNKNOWN"
      );
      const serviceState = serviceStateFromEndpoints({ endpointStates });

      const serviceUptime24h = computeServiceUptimeFromChecks({
        db,
        serviceId: service.id,
        probe: "internal",
        sinceMs: since24hMs,
      });
      const serviceUptime90d = computeServiceUptimeFromDailyRollups({
        db,
        serviceId: service.id,
        probe: "internal",
        sinceMs: since90dMs,
      });
      const serviceUptime365d = computeServiceUptimeFromDailyRollups({
        db,
        serviceId: service.id,
        probe: "internal",
        sinceMs: since365dMs,
      });

      const resp: PublicPageResponse = {
        mode: "public",
        host,
        nowMs,
        deploy: (() => {
          const row = db.getServiceDokploy({ serviceId: service.id });
          if (!row) return null;
          return { lastDeployedAtMs: row.lastDeployedAtMs };
        })(),
        service,
        endpoints: endpointsWithStatus,
        serviceState,
        serviceUptime: {
          last24h: serviceUptime24h,
          last90d: serviceUptime90d,
          last365d: serviceUptime365d,
        },
        checks24hByEndpointId,
      };

      return json(resp);
    }

    if (url.pathname === "/api/admin/services" && req.method === "GET") {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const resp: AdminServicesResponse = {
        services: db.listServices().map((s) => ({
          ...s,
          deploy: db.getServiceDokploy({ serviceId: s.id }),
          endpoints: db
            .listEndpointsByServiceId({ serviceId: s.id })
            .map((e) => {
              const latest = db.getLatestCheck({
                endpointId: e.id,
                probe: "internal",
              });
              const state = endpointStateFromLatest({ latest });
              return {
                ...e,
                latest: latest
                  ? {
                      atMs: latest.atMs,
                      state,
                      statusCode: latest.statusCode,
                      latencyMs: latest.latencyMs,
                      errorKind: latest.errorKind,
                    }
                  : null,
              };
            }),
        })),
      };
      return json(resp);
    }

    if (url.pathname === "/api/admin/services" && req.method === "POST") {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object")
        return json({ error: "Invalid JSON body" }, { status: 400 });

      const parsed = body as Partial<{
        slug: string;
        name: string;
        primaryDomain: string | null;
        publicStatusHost: string;
      }>;

      if (!parsed.slug || !parsed.name || !parsed.publicStatusHost) {
        return json(
          { error: "slug, name, publicStatusHost are required" },
          { status: 400 }
        );
      }

      const service: ServiceRow = {
        id: crypto.randomUUID(),
        slug: parsed.slug,
        name: parsed.name,
        primaryDomain: parsed.primaryDomain ?? null,
        publicStatusHost: parsed.publicStatusHost,
        enabled: 1,
        createdAtMs: Date.now(),
      };
      db.upsertService({ service });
      return json({ service }, { status: 201 });
    }

    if (
      url.pathname.startsWith("/api/admin/services/") &&
      req.method === "PATCH"
    ) {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const id = url.pathname.replace("/api/admin/services/", "");
      if (!id) return json({ error: "Missing id" }, { status: 400 });

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object")
        return json({ error: "Invalid JSON body" }, { status: 400 });
      const parsed = body as Partial<
        Pick<
          ServiceRow,
          "slug" | "name" | "primaryDomain" | "publicStatusHost" | "enabled"
        >
      >;

      db.updateService({ id, patch: parsed });
      const service = db.getServiceById({ id });
      return json({ service });
    }

    if (url.pathname === "/api/admin/endpoints" && req.method === "POST") {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object")
        return json({ error: "Invalid JSON body" }, { status: 400 });

      const parsed = body as Partial<EndpointRow>;
      if (
        !parsed.serviceId ||
        !parsed.key ||
        !parsed.displayName ||
        !parsed.internalMode
      ) {
        return json(
          { error: "serviceId, key, displayName, internalMode are required" },
          { status: 400 }
        );
      }
      if (!parsed.internalPath) {
        return json({ error: "internalPath is required" }, { status: 400 });
      }

      const endpoint: EndpointRow = {
        id: crypto.randomUUID(),
        serviceId: parsed.serviceId,
        key: parsed.key,
        displayName: parsed.displayName,
        internalMode: parsed.internalMode,
        internalUrl: parsed.internalUrl ?? null,
        internalHost: parsed.internalHost ?? null,
        internalPath: parsed.internalPath,
        publicUrl: parsed.publicUrl ?? null,
        method: parsed.method ?? "GET",
        intervalSec: parsed.intervalSec ?? 60,
        timeoutMs: parsed.timeoutMs ?? 5000,
        warnMs: parsed.warnMs ?? 500,
        degradedMs: parsed.degradedMs ?? 2000,
        expectedStatusMin: parsed.expectedStatusMin ?? 200,
        expectedStatusMax: parsed.expectedStatusMax ?? 399,
        enabled: parsed.enabled ?? 1,
        createdAtMs: Date.now(),
      };

      db.upsertEndpoint({ endpoint });
      return json({ endpoint }, { status: 201 });
    }

    if (
      url.pathname.startsWith("/api/admin/services/") &&
      url.pathname.endsWith("/dokploy") &&
      req.method === "PATCH"
    ) {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const serviceId = url.pathname
        .replace("/api/admin/services/", "")
        .replace("/dokploy", "");
      if (!serviceId)
        return json({ error: "Missing serviceId" }, { status: 400 });

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object") {
        return json({ error: "Invalid JSON body" }, { status: 400 });
      }

      const parsed = body as Partial<{ type: DokployRefType; refId: string }>;
      if (!parsed.type || !parsed.refId) {
        return json({ error: "type and refId are required" }, { status: 400 });
      }

      db.upsertServiceDokploy({
        serviceId,
        type: parsed.type,
        refId: parsed.refId,
      });

      return json({ ok: true });
    }

    if (
      url.pathname.startsWith("/api/admin/endpoints/") &&
      req.method === "PATCH"
    ) {
      const auth = requireAdminToken({ req, env });
      if (!auth.ok) return json({ error: auth.error }, { status: 401 });

      const id = url.pathname.replace("/api/admin/endpoints/", "");
      if (!id) return json({ error: "Missing id" }, { status: 400 });

      const body: unknown = await req.json().catch(() => null);
      if (!body || typeof body !== "object")
        return json({ error: "Invalid JSON body" }, { status: 400 });

      const parsed = body as Partial<EndpointRow>;
      db.updateEndpoint({ id, patch: parsed });

      return json({ ok: true });
    }

    return json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    console.error("API handler error", error);

    const message = error instanceof Error ? error.message : "Unknown error";

    return json(
      {
        error: "Internal server error",
        detail: message,
      },
      { status: 500 }
    );
  }
};
