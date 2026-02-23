import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://imaxart:imaxart@localhost:5432/imaxart',
  },
  dialect: 'postgresql',
  out: './migrations',
  schema: './src/schema.ts',
})
