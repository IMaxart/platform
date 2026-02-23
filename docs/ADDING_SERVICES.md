# Adding services and endpoints

## Terms

- Service: a domain/project you want to monitor (e.g. `ingramkalina.pl`)
- Endpoint: a concrete check target inside a service (e.g. `frontend`, `api`)

## Admin panel

Open `https://status.imaxart.com/admin`.

To use admin endpoints you must set:

- `ADMIN_WRITE_TOKEN` in the container env
- paste the same value in the Admin UI token field (stored locally in your browser)

## Creating a service

In the Admin UI, create a service with:

- `slug`: stable identifier (`ingramkalina`)
- `name`: display name (`ingramkalina.pl`)
- `publicStatusHost`: where the public status page should live (`status.ingramkalina.pl`)
- optional `primaryDomain`: (`ingramkalina.pl`)

## Creating endpoints

### internalMode: traefikHost (recommended in Dokploy)

Use this when you want to check services internally (no internet needed) via Traefik routing:

- `internalMode`: `traefikHost`
- `internalHost`: the host Traefik should route to (e.g. `ingramkalina.pl`)
- `internalPath`: path to probe (e.g. `/` or `/health`)
- `INTERNAL_TRAEFIK_BASE_URL`: set to an internal Traefik URL reachable from this container (default `http://traefik`)

The monitor will send a request to:

- `${INTERNAL_TRAEFIK_BASE_URL}${internalPath}` with the HTTP `Host` header set to `internalHost`.

### internalMode: directUrl

Use this when you have direct service discovery in the Docker network:

- `internalMode`: `directUrl`
- `internalUrl`: e.g. `http://my-service:3000/health`

### Optional public URL

If you set `publicUrl`, the monitor will also probe it (only when the internet check is OK):

- `publicUrl`: e.g. `https://ingramkalina.pl/health`

## Latency thresholds

Each endpoint has:

- `timeoutMs`: abort threshold (request timeout)
- `degradedMs`: if OK but slower than this, endpoint becomes `DEGRADED`

This affects the UI:

- `UP`: OK and fast
- `DEGRADED`: OK but slow
- `DOWN`: not OK / timeout / network error

## Optional: last deployment time (Dokploy)

If you set Dokploy env vars in the status app:

- `DOKPLOY_BASE_URL`
- `DOKPLOY_API_KEY`

You can map a service to a Dokploy application/compose in the Admin UI.

The public status page will then show `Last deploy` when the sync can parse timestamps from Dokploy deployment history.
