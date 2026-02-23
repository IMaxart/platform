import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['packages/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      include: ['packages/analytics/src/**', 'src/lib/**'],
      exclude: ['**/*.test.ts', '**/index.ts'],
    },
  },
})
