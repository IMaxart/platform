import { db } from '@platform/db'
import { users } from '@platform/db/schema'
import { count } from 'drizzle-orm'

import { auth } from './index'

export const seedAdmin = async () => {
  const email = process.env['ADMIN_EMAIL']
  const name = process.env['ADMIN_NAME'] ?? 'Admin'
  const password = process.env['ADMIN_PASSWORD']

  if (!email || !password) return

  const [{ total }] = await db.select({ total: count() }).from(users)
  if (total > 0) return

  try {
    await auth.api.signUpEmail({
      body: { email, name, password },
    })
    console.log(`Admin user created: ${email}`)
  } catch (err) {
    console.error('Failed to create admin user:', err)
  }
}
