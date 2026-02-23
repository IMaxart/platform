import path from "node:path";
import { fileURLToPath } from "node:url";

import { handleApiRequest } from "./src/server/api";
import { createDb } from "./src/server/db";
import { startDokploySync } from "./src/server/dokploy";
import { getEnv } from "./src/server/env";
import { startMonitoring } from "./src/server/monitor";
import { handleStaticRequest } from "./src/server/static";

// Ensure relative paths (dist/, .local/, etc.) work regardless of process CWD.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const env = getEnv();
const db = createDb({ dbPath: env.dbPath });

startMonitoring({ db, env });
startDokploySync({ db, env });

Bun.serve({
  port: env.port,
  hostname: env.hostname,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/api/")) {
      return await handleApiRequest({ req, db, env });
    }

    return await handleStaticRequest({ req });
  },
});

console.log(`Status app listening on http://localhost:${String(env.port)}`);
