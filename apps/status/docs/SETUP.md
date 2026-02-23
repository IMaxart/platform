# Status - setup

## Local development

1. Install deps

```sh
bun install
```

2. Run dev server (Vite)

```sh
bun run dev
```

## Production (local)

1. Build the client bundle

```sh
bun run build
```

2. Run the Bun server (serves `dist/client` + API + monitoring)

```sh
bun run start
```

## Environment variables

Required for write access:

- `ADMIN_WRITE_TOKEN`: token required for all `/api/admin/*` routes. The Admin UI stores this in your browser localStorage and sends it as `x-admin-token`.

Recommended:

- `ADMIN_HOST`: central host for the admin panel. Default: `status.imaxart.com`
- `STATUS_DB_PATH`: SQLite file path. Default: `./.local/status.sqlite`
- `INTERNAL_TRAEFIK_BASE_URL`: internal Traefik URL for `traefikHost` probes. Default: `http://traefik`
- `INTERNET_CHECK_URL`: URL used to detect internet connectivity. Default: `https://1.1.1.1`
- `INTERNET_INTERVAL_SEC`: internet check interval. Default: `30`
- `MAINTENANCE_INTERVAL_SEC`: retention + rollup interval. Default: `300`
- `CHECKS_RETENTION_HOURS`: raw checks retention. Default: `48`

Optional (Dokploy deployments -> `lastDeployedAt`):

- `DOKPLOY_BASE_URL`: base URL of your Dokploy instance (e.g. `https://dokploy.example.com`)
- `DOKPLOY_API_KEY`: API key generated in Dokploy profile
- `DOKPLOY_SYNC_INTERVAL_SEC`: sync interval. Default: `300`

## Dokploy deployment

### 1) Build & start

- Container listens on port `3000` by default (`PORT` env can override).
- Dokploy should route HTTP traffic to the container port `3000`.

### 2) Persist SQLite

Mount a persistent volume and point the DB to it:

- Volume mount: `/data`
- Env: `STATUS_DB_PATH=/data/status.sqlite`

### 3) Multiple hosts (one deployment)

In Dokploy -> Domains, add multiple hosts pointing to the same container port:

- `status.imaxart.com` (admin)
- `status.ingramkalina.pl` (public)
- `status.swieckaceremonia.com` (public)
- ...

The app chooses what to render based on the incoming `Host` header.
