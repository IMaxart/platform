import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { handleApiRequest } from './src/server/api'
import { createDb } from './src/server/db'
import { startDokploySync } from './src/server/dokploy'
import { getEnv } from './src/server/env'
import { startMonitoring } from './src/server/monitor'
import { handleStaticRequest } from './src/server/static'

// Ensure relative paths (dist/, .local/, etc.) work regardless of process CWD.
process.chdir(path.dirname(fileURLToPath(import.meta.url)))

const env = getEnv()
const db = createDb()

startMonitoring({ db, env })
startDokploySync({ db, env })

Bun.serve({
  async fetch(req) {
    const url = new URL(req.url)

    if (url.pathname === '/health') {
      return Response.json({ ok: true })
    }

    if (url.pathname.startsWith('/api/')) {
      return await handleApiRequest({ db, req })
    }

    return await handleStaticRequest({ req })
  },
  hostname: env.hostname,
  port: env.port,
})

console.log(`Status app listening on http://localhost:${String(env.port)}`)
