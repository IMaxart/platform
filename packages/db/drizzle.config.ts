import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://platform:platform@localhost:5432/platform',
  },
  dialect: 'postgresql',
  out: './migrations',
  schema: './src/schema.ts',
})
