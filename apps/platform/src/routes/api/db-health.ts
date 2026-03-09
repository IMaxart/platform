import { db } from '@platform/db'
import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

export const Route = createFileRoute('/api/db-health')({
  server: {
    handlers: {
      GET: async () => {
        try {
          await db.execute(sql`SELECT 1`)
          return Response.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
          })
        } catch {
          return Response.json(
            { status: 'error', timestamp: new Date().toISOString() },
            { status: 503 },
          )
        }
      },
    },
  },
})
