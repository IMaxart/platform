const parseIntOr = ({
  fallback,
  value,
}: {
  fallback: number
  value: string | undefined
}) => {
  if (value === undefined) return fallback
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export type Env = {
  adminDomain: string
  checksRetentionHours: number
  dokployApiKey: null | string
  dokployBaseUrl: null | string
  dokploySyncIntervalSec: number
  hostname: string
  internalTraefikBaseUrl: string
  internetCheckUrl: string
  internetIntervalSec: number
  maintenanceIntervalSec: number
  port: number
}

export const getEnv = (): Env => {
  const env = process.env
  const port = parseIntOr({ fallback: 3000, value: env['PORT'] })

  return {
    adminDomain: env['ADMIN_DOMAIN'] ?? 'localhost',
    checksRetentionHours: parseIntOr({
      fallback: 48,
      value: env['CHECKS_RETENTION_HOURS'],
    }),
    dokployApiKey: env['DOKPLOY_API_KEY'] ?? null,
    dokployBaseUrl: env['DOKPLOY_BASE_URL'] ?? null,
    dokploySyncIntervalSec: parseIntOr({
      fallback: 300,
      value: env['DOKPLOY_SYNC_INTERVAL_SEC'],
    }),
    hostname: env['HOST'] ?? '0.0.0.0',
    internalTraefikBaseUrl:
      env['INTERNAL_TRAEFIK_BASE_URL'] ?? 'http://dokploy-traefik',
    internetCheckUrl: env['INTERNET_CHECK_URL'] ?? 'https://1.1.1.1',
    internetIntervalSec: parseIntOr({
      fallback: 30,
      value: env['INTERNET_INTERVAL_SEC'],
    }),
    maintenanceIntervalSec: parseIntOr({
      fallback: 300,
      value: env['MAINTENANCE_INTERVAL_SEC'],
    }),
    port,
  }
}
