const parseIntOr = ({
  value,
  fallback,
}: {
  value: string | undefined;
  fallback: number;
}) => {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export type Env = {
  port: number;
  hostname: string;
  adminHost: string;
  adminWriteToken: string | null;
  dbPath: string;
  internalTraefikBaseUrl: string;
  internetCheckUrl: string;
  internetIntervalSec: number;
  maintenanceIntervalSec: number;
  checksRetentionHours: number;
  dokployBaseUrl: string | null;
  dokployApiKey: string | null;
  dokploySyncIntervalSec: number;
};

export const getEnv = (): Env => {
  const port = parseIntOr({ value: process.env.PORT, fallback: 3000 });

  return {
    port,
    hostname: process.env.HOSTNAME ?? "0.0.0.0",
    adminHost: process.env.ADMIN_HOST ?? "status.imaxart.com",
    adminWriteToken: process.env.ADMIN_WRITE_TOKEN ?? null,
    dbPath: process.env.STATUS_DB_PATH ?? "./.local/status.sqlite",
    internalTraefikBaseUrl:
      process.env.INTERNAL_TRAEFIK_BASE_URL ?? "http://traefik",
    internetCheckUrl: process.env.INTERNET_CHECK_URL ?? "https://1.1.1.1",
    internetIntervalSec: parseIntOr({
      value: process.env.INTERNET_INTERVAL_SEC,
      fallback: 30,
    }),
    maintenanceIntervalSec: parseIntOr({
      value: process.env.MAINTENANCE_INTERVAL_SEC,
      fallback: 300,
    }),
    checksRetentionHours: parseIntOr({
      value: process.env.CHECKS_RETENTION_HOURS,
      fallback: 48,
    }),
    dokployBaseUrl: process.env.DOKPLOY_BASE_URL ?? null,
    dokployApiKey: process.env.DOKPLOY_API_KEY ?? null,
    dokploySyncIntervalSec: parseIntOr({
      value: process.env.DOKPLOY_SYNC_INTERVAL_SEC,
      fallback: 300,
    }),
  };
};
