import { db } from '@platform/db'
import { users } from '@platform/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { sql } from 'drizzle-orm'

export const searchUsers = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    if (data.query.length < 2) return []

    return db
      .select({ email: users.email, id: users.id, name: users.name })
      .from(users)
      .where(sql`${users.email} ILIKE ${'%' + data.query + '%'}`)
      .limit(10)
  })
