import { auth } from '@platform/auth'
import { db } from '@platform/db'
import { users } from '@platform/db/schema'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { eq } from 'drizzle-orm'

export const getSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()

    const session = await auth.api.getSession({
      headers: request.headers,
    })

    return session
  },
)

export const getUserRole = createServerFn({ method: 'GET' })
  .inputValidator((userId: string) => userId)
  .handler(async ({ data: userId }) => {
    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.id, userId))

    return user?.role ?? 'user'
  })
