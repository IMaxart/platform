import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://analytics:analytics@localhost:5432/analytics',
  },
  dialect: 'postgresql',
  out: './src/lib/db/migrations',
  schema: './src/lib/db/schema.ts',
})
