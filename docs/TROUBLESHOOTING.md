# Troubleshooting

## `bun run start` serves the wrong app on port 3000

If you have another dev server already using `localhost:3000`, your requests may hit that process instead.

Quick workaround:

```sh
PORT=3333 bun run start
```

## Public host returns 404 JSON

`/api/public/page` returns `{ mode: "notFound" }` when no service is configured for the current `Host`.

Fix:

- create a service in the admin UI
- set `publicStatusHost` to exactly the host you are using (e.g. `status.ingramkalina.pl`)

## `traefikHost` probes never become UP

Make sure:

- the status app container is connected to the same Docker network as Traefik (`dokploy-network`)
- `INTERNAL_TRAEFIK_BASE_URL` points to Traefik inside that network
- `internalHost` matches a host rule configured in Dokploy for the target app

## Admin API always returns 401

All `/api/admin/*` routes require:

- env var `ADMIN_WRITE_TOKEN` set in the container
- request header `x-admin-token` matching that token
