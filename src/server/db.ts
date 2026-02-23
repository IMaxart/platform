import fs from "node:fs";
import path from "node:path";

import { Database } from "bun:sqlite";

import type { DokployRefType } from "~/shared/api-types";

import { named } from "./sql";
import type {
  CheckRow,
  DailyRollupRow,
  EndpointRow,
  InternetCheckRow,
  ProbeKind,
  ServiceRow,
} from "./types";

const ensureDbParentDir = ({ dbPath }: { dbPath: string }) => {
  const parent = path.dirname(dbPath);
  fs.mkdirSync(parent, { recursive: true });
};

const asRow = <T>(row: unknown): T => {
  return row as T;
};

export type Db = {
  sqlite: Database;
  migrate: () => void;
  listServices: () => ServiceRow[];
  getServiceById: (params: { id: string }) => ServiceRow | null;
  getServiceByPublicHost: (params: { host: string }) => ServiceRow | null;
  upsertService: (params: {
    service: {
      id: string;
      slug: string;
      name: string;
      primaryDomain: string | null;
      publicStatusHost: string;
      enabled: 0 | 1;
      createdAtMs: number;
    };
  }) => void;
  updateService: (params: {
    id: string;
    patch: Partial<
      Pick<
        ServiceRow,
        "slug" | "name" | "primaryDomain" | "publicStatusHost" | "enabled"
      >
    >;
  }) => void;
  listEndpointsByServiceId: (params: { serviceId: string }) => EndpointRow[];
  listActiveEndpoints: () => EndpointRow[];
  upsertEndpoint: (params: { endpoint: EndpointRow }) => void;
  updateEndpoint: (params: { id: string; patch: Partial<EndpointRow> }) => void;
  insertCheck: (params: { check: CheckRow }) => void;
  insertInternetCheck: (params: { check: InternetCheckRow }) => void;
  getLatestInternetCheck: () => InternetCheckRow | null;
  getLatestCheck: (params: {
    endpointId: string;
    probe: ProbeKind;
  }) => CheckRow | null;
  listChecksSince: (params: {
    endpointId: string;
    probe: ProbeKind;
    sinceMs: number;
  }) => CheckRow[];
  deleteChecksBefore: (params: { beforeMs: number }) => void;
  upsertDailyRollup: (params: { rollup: DailyRollupRow }) => void;
  getDailyRollups: (params: {
    endpointId: string;
    probe: ProbeKind;
    sinceMs: number;
  }) => DailyRollupRow[];
  getServiceDokploy: (params: { serviceId: string }) => {
    serviceId: string;
    type: DokployRefType;
    refId: string;
    lastDeployedAtMs: number | null;
    lastSyncAtMs: number;
  } | null;
  upsertServiceDokploy: (params: {
    serviceId: string;
    type: DokployRefType;
    refId: string;
  }) => void;
  updateServiceDokploySync: (params: {
    serviceId: string;
    lastDeployedAtMs: number | null;
    lastSyncAtMs: number;
  }) => void;
};

export const createDb = ({ dbPath }: { dbPath: string }): Db => {
  ensureDbParentDir({ dbPath });

  const sqlite = new Database(dbPath);
  sqlite.exec("PRAGMA journal_mode = WAL;");
  sqlite.exec("PRAGMA synchronous = NORMAL;");
  sqlite.exec("PRAGMA foreign_keys = ON;");

  const migrate = () => {
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        primaryDomain TEXT,
        publicStatusHost TEXT NOT NULL UNIQUE,
        enabled INTEGER NOT NULL DEFAULT 1,
        createdAtMs INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS endpoints (
        id TEXT PRIMARY KEY,
        serviceId TEXT NOT NULL,
        key TEXT NOT NULL,
        displayName TEXT NOT NULL,
        internalMode TEXT NOT NULL,
        internalUrl TEXT,
        internalHost TEXT,
        internalPath TEXT NOT NULL,
        publicUrl TEXT,
        method TEXT NOT NULL,
        intervalSec INTEGER NOT NULL,
        timeoutMs INTEGER NOT NULL,
        warnMs INTEGER NOT NULL,
        degradedMs INTEGER NOT NULL,
        expectedStatusMin INTEGER NOT NULL,
        expectedStatusMax INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        createdAtMs INTEGER NOT NULL,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      );

      CREATE UNIQUE INDEX IF NOT EXISTS endpoints_service_key_unique
        ON endpoints(serviceId, key);

      CREATE TABLE IF NOT EXISTS checks (
        id TEXT PRIMARY KEY,
        endpointId TEXT NOT NULL,
        probe TEXT NOT NULL,
        atMs INTEGER NOT NULL,
        ok INTEGER NOT NULL,
        degraded INTEGER NOT NULL,
        statusCode INTEGER,
        latencyMs INTEGER,
        errorKind TEXT,
        errorMessage TEXT,
        FOREIGN KEY (endpointId) REFERENCES endpoints(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS checks_endpoint_probe_at
        ON checks(endpointId, probe, atMs);

      CREATE TABLE IF NOT EXISTS internet_checks (
        id TEXT PRIMARY KEY,
        atMs INTEGER NOT NULL,
        ok INTEGER NOT NULL,
        latencyMs INTEGER,
        errorKind TEXT,
        errorMessage TEXT
      );

      CREATE INDEX IF NOT EXISTS internet_checks_at
        ON internet_checks(atMs);

      CREATE TABLE IF NOT EXISTS rollups_daily (
        endpointId TEXT NOT NULL,
        probe TEXT NOT NULL,
        dayStartMs INTEGER NOT NULL,
        total INTEGER NOT NULL,
        up INTEGER NOT NULL,
        degraded INTEGER NOT NULL,
        down INTEGER NOT NULL,
        avgLatencyMs REAL,
        p95LatencyMs INTEGER,
        PRIMARY KEY (endpointId, probe, dayStartMs),
        FOREIGN KEY (endpointId) REFERENCES endpoints(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS service_dokploy (
        serviceId TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        refId TEXT NOT NULL,
        lastDeployedAtMs INTEGER,
        lastSyncAtMs INTEGER NOT NULL,
        FOREIGN KEY (serviceId) REFERENCES services(id) ON DELETE CASCADE
      );
    `);
  };

  // We prepare statements eagerly for performance; ensure schema exists first.
  migrate();

  const stmtListServices = sqlite.prepare(
    `SELECT * FROM services ORDER BY name ASC`
  );
  const listServices = () =>
    stmtListServices.all().map((r) => asRow<ServiceRow>(r));

  const stmtGetServiceById = sqlite.prepare(
    `SELECT * FROM services WHERE id = ? LIMIT 1`
  );
  const getServiceById = ({ id }: { id: string }) => {
    const row = stmtGetServiceById.get(id);
    return row ? asRow<ServiceRow>(row) : null;
  };

  const stmtGetServiceByPublicHost = sqlite.prepare(
    `SELECT * FROM services WHERE publicStatusHost = ? AND enabled = 1 LIMIT 1`
  );
  const getServiceByPublicHost = ({ host }: { host: string }) => {
    const row = stmtGetServiceByPublicHost.get(host);
    return row ? asRow<ServiceRow>(row) : null;
  };

  const stmtUpsertService = sqlite.prepare(`
    INSERT INTO services (id, slug, name, primaryDomain, publicStatusHost, enabled, createdAtMs)
    VALUES ($id, $slug, $name, $primaryDomain, $publicStatusHost, $enabled, $createdAtMs)
    ON CONFLICT(id) DO UPDATE SET
      slug = excluded.slug,
      name = excluded.name,
      primaryDomain = excluded.primaryDomain,
      publicStatusHost = excluded.publicStatusHost,
      enabled = excluded.enabled
  `);
  const upsertService: Db["upsertService"] = ({ service }) => {
    stmtUpsertService.run(named(service));
  };

  const stmtUpdateService = sqlite.prepare(`
    UPDATE services SET
      slug = COALESCE($slug, slug),
      name = COALESCE($name, name),
      primaryDomain = COALESCE($primaryDomain, primaryDomain),
      publicStatusHost = COALESCE($publicStatusHost, publicStatusHost),
      enabled = COALESCE($enabled, enabled)
    WHERE id = $id
  `);
  const updateService: Db["updateService"] = ({ id, patch }) => {
    stmtUpdateService.run(
      named({
        id,
        slug: patch.slug ?? null,
        name: patch.name ?? null,
        primaryDomain: patch.primaryDomain ?? null,
        publicStatusHost: patch.publicStatusHost ?? null,
        enabled: patch.enabled ?? null,
      })
    );
  };

  const stmtListEndpointsByServiceId = sqlite.prepare(
    `SELECT * FROM endpoints WHERE serviceId = ? ORDER BY key ASC`
  );
  const listEndpointsByServiceId: Db["listEndpointsByServiceId"] = ({
    serviceId,
  }) => {
    return stmtListEndpointsByServiceId
      .all(serviceId)
      .map((r) => asRow<EndpointRow>(r));
  };

  const stmtListActiveEndpoints = sqlite.prepare(
    `SELECT * FROM endpoints WHERE enabled = 1 ORDER BY serviceId ASC, key ASC`
  );
  const listActiveEndpoints = () =>
    stmtListActiveEndpoints.all().map((r) => asRow<EndpointRow>(r));

  const stmtUpsertEndpoint = sqlite.prepare(`
    INSERT INTO endpoints (
      id, serviceId, key, displayName,
      internalMode, internalUrl, internalHost, internalPath, publicUrl,
      method, intervalSec, timeoutMs, warnMs, degradedMs,
      expectedStatusMin, expectedStatusMax, enabled, createdAtMs
    )
    VALUES (
      $id, $serviceId, $key, $displayName,
      $internalMode, $internalUrl, $internalHost, $internalPath, $publicUrl,
      $method, $intervalSec, $timeoutMs, $warnMs, $degradedMs,
      $expectedStatusMin, $expectedStatusMax, $enabled, $createdAtMs
    )
    ON CONFLICT(id) DO UPDATE SET
      key = excluded.key,
      displayName = excluded.displayName,
      internalMode = excluded.internalMode,
      internalUrl = excluded.internalUrl,
      internalHost = excluded.internalHost,
      internalPath = excluded.internalPath,
      publicUrl = excluded.publicUrl,
      method = excluded.method,
      intervalSec = excluded.intervalSec,
      timeoutMs = excluded.timeoutMs,
      warnMs = excluded.warnMs,
      degradedMs = excluded.degradedMs,
      expectedStatusMin = excluded.expectedStatusMin,
      expectedStatusMax = excluded.expectedStatusMax,
      enabled = excluded.enabled
  `);
  const upsertEndpoint: Db["upsertEndpoint"] = ({ endpoint }) => {
    stmtUpsertEndpoint.run(named(endpoint));
  };

  const stmtUpdateEndpoint = sqlite.prepare(`
    UPDATE endpoints SET
      serviceId = COALESCE($serviceId, serviceId),
      key = COALESCE($key, key),
      displayName = COALESCE($displayName, displayName),
      internalMode = COALESCE($internalMode, internalMode),
      internalUrl = COALESCE($internalUrl, internalUrl),
      internalHost = COALESCE($internalHost, internalHost),
      internalPath = COALESCE($internalPath, internalPath),
      publicUrl = COALESCE($publicUrl, publicUrl),
      method = COALESCE($method, method),
      intervalSec = COALESCE($intervalSec, intervalSec),
      timeoutMs = COALESCE($timeoutMs, timeoutMs),
      warnMs = COALESCE($warnMs, warnMs),
      degradedMs = COALESCE($degradedMs, degradedMs),
      expectedStatusMin = COALESCE($expectedStatusMin, expectedStatusMin),
      expectedStatusMax = COALESCE($expectedStatusMax, expectedStatusMax),
      enabled = COALESCE($enabled, enabled)
    WHERE id = $id
  `);
  const updateEndpoint: Db["updateEndpoint"] = ({ id, patch }) => {
    stmtUpdateEndpoint.run(
      named({
        id,
        serviceId: patch.serviceId ?? null,
        key: patch.key ?? null,
        displayName: patch.displayName ?? null,
        internalMode: patch.internalMode ?? null,
        internalUrl: patch.internalUrl ?? null,
        internalHost: patch.internalHost ?? null,
        internalPath: patch.internalPath ?? null,
        publicUrl: patch.publicUrl ?? null,
        method: patch.method ?? null,
        intervalSec: patch.intervalSec ?? null,
        timeoutMs: patch.timeoutMs ?? null,
        warnMs: patch.warnMs ?? null,
        degradedMs: patch.degradedMs ?? null,
        expectedStatusMin: patch.expectedStatusMin ?? null,
        expectedStatusMax: patch.expectedStatusMax ?? null,
        enabled: patch.enabled ?? null,
      })
    );
  };

  const stmtInsertCheck = sqlite.prepare(`
    INSERT INTO checks (
      id, endpointId, probe, atMs, ok, degraded, statusCode, latencyMs, errorKind, errorMessage
    )
    VALUES (
      $id, $endpointId, $probe, $atMs, $ok, $degraded, $statusCode, $latencyMs, $errorKind, $errorMessage
    )
  `);
  const insertCheck: Db["insertCheck"] = ({ check }) => {
    stmtInsertCheck.run(named(check));
  };

  const stmtInsertInternetCheck = sqlite.prepare(`
    INSERT INTO internet_checks (id, atMs, ok, latencyMs, errorKind, errorMessage)
    VALUES ($id, $atMs, $ok, $latencyMs, $errorKind, $errorMessage)
  `);
  const insertInternetCheck: Db["insertInternetCheck"] = ({ check }) => {
    stmtInsertInternetCheck.run(named(check));
  };

  const stmtGetLatestInternet = sqlite.prepare(
    `SELECT * FROM internet_checks ORDER BY atMs DESC LIMIT 1`
  );
  const getLatestInternetCheck = () => {
    const row = stmtGetLatestInternet.get();
    return row ? asRow<InternetCheckRow>(row) : null;
  };

  const stmtGetLatestCheck = sqlite.prepare(`
    SELECT * FROM checks
    WHERE endpointId = $endpointId AND probe = $probe
    ORDER BY atMs DESC
    LIMIT 1
  `);
  const getLatestCheck: Db["getLatestCheck"] = ({ endpointId, probe }) => {
    const row = stmtGetLatestCheck.get(named({ endpointId, probe }));
    return row ? asRow<CheckRow>(row) : null;
  };

  const stmtListChecksSince = sqlite.prepare(`
    SELECT * FROM checks
    WHERE endpointId = $endpointId AND probe = $probe AND atMs >= $sinceMs
    ORDER BY atMs ASC
  `);
  const listChecksSince: Db["listChecksSince"] = ({
    endpointId,
    probe,
    sinceMs,
  }) => {
    return stmtListChecksSince
      .all(named({ endpointId, probe, sinceMs }))
      .map((r) => asRow<CheckRow>(r));
  };

  const stmtDeleteChecksBefore = sqlite.prepare(
    `DELETE FROM checks WHERE atMs < $beforeMs`
  );
  const stmtDeleteInternetChecksBefore = sqlite.prepare(
    `DELETE FROM internet_checks WHERE atMs < $beforeMs`
  );
  const deleteChecksBefore: Db["deleteChecksBefore"] = ({ beforeMs }) => {
    stmtDeleteChecksBefore.run(named({ beforeMs }));
    stmtDeleteInternetChecksBefore.run(named({ beforeMs }));
  };

  const stmtUpsertDailyRollup = sqlite.prepare(`
    INSERT INTO rollups_daily (
      endpointId, probe, dayStartMs,
      total, up, degraded, down,
      avgLatencyMs, p95LatencyMs
    )
    VALUES (
      $endpointId, $probe, $dayStartMs,
      $total, $up, $degraded, $down,
      $avgLatencyMs, $p95LatencyMs
    )
    ON CONFLICT(endpointId, probe, dayStartMs) DO UPDATE SET
      total = excluded.total,
      up = excluded.up,
      degraded = excluded.degraded,
      down = excluded.down,
      avgLatencyMs = excluded.avgLatencyMs,
      p95LatencyMs = excluded.p95LatencyMs
  `);
  const upsertDailyRollup: Db["upsertDailyRollup"] = ({ rollup }) => {
    stmtUpsertDailyRollup.run(named(rollup));
  };

  const stmtGetDailyRollups = sqlite.prepare(`
    SELECT * FROM rollups_daily
    WHERE endpointId = $endpointId AND probe = $probe AND dayStartMs >= $sinceMs
    ORDER BY dayStartMs ASC
  `);
  const getDailyRollups: Db["getDailyRollups"] = ({
    endpointId,
    probe,
    sinceMs,
  }) => {
    return stmtGetDailyRollups
      .all(named({ endpointId, probe, sinceMs }))
      .map((r) => asRow<DailyRollupRow>(r));
  };

  const stmtGetServiceDokploy = sqlite.prepare(
    `SELECT * FROM service_dokploy WHERE serviceId = ? LIMIT 1`
  );
  const getServiceDokploy: Db["getServiceDokploy"] = ({ serviceId }) => {
    const row = stmtGetServiceDokploy.get(serviceId);
    if (!row) return null;
    return asRow<{
      serviceId: string;
      type: DokployRefType;
      refId: string;
      lastDeployedAtMs: number | null;
      lastSyncAtMs: number;
    }>(row);
  };

  const stmtUpsertServiceDokploy = sqlite.prepare(`
    INSERT INTO service_dokploy (serviceId, type, refId, lastDeployedAtMs, lastSyncAtMs)
    VALUES ($serviceId, $type, $refId, NULL, 0)
    ON CONFLICT(serviceId) DO UPDATE SET
      type = excluded.type,
      refId = excluded.refId
  `);
  const upsertServiceDokploy: Db["upsertServiceDokploy"] = ({
    serviceId,
    type,
    refId,
  }) => {
    stmtUpsertServiceDokploy.run(named({ serviceId, type, refId }));
  };

  const stmtUpdateServiceDokploySync = sqlite.prepare(`
    UPDATE service_dokploy SET
      lastDeployedAtMs = $lastDeployedAtMs,
      lastSyncAtMs = $lastSyncAtMs
    WHERE serviceId = $serviceId
  `);
  const updateServiceDokploySync: Db["updateServiceDokploySync"] = ({
    serviceId,
    lastDeployedAtMs,
    lastSyncAtMs,
  }) => {
    stmtUpdateServiceDokploySync.run({
      $serviceId: serviceId,
      $lastDeployedAtMs: lastDeployedAtMs,
      $lastSyncAtMs: lastSyncAtMs,
    });
  };

  return {
    sqlite,
    migrate,
    listServices,
    getServiceById,
    getServiceByPublicHost,
    upsertService,
    updateService,
    listEndpointsByServiceId,
    listActiveEndpoints,
    upsertEndpoint,
    updateEndpoint,
    insertCheck,
    insertInternetCheck,
    getLatestInternetCheck,
    getLatestCheck,
    listChecksSince,
    deleteChecksBefore,
    upsertDailyRollup,
    getDailyRollups,
    getServiceDokploy,
    upsertServiceDokploy,
    updateServiceDokploySync,
  };
};
