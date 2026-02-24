import { paraglideVitePlugin } from '@inlang/paraglide-js'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [
    paraglideVitePlugin({
      cookieName: 'PARAGLIDE_LOCALE',
      emitTsDeclarations: true,
      outdir: './src/paraglide',
      project: './project.inlang',
      strategy: ['cookie', 'preferredLanguage', 'baseLocale'],
    }),
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        enabled: false,
      },
    }),
    react(),
  ],
  preview: {
    host: '127.0.0.1',
  },
  server: {
    port: 3001,
  },
})
