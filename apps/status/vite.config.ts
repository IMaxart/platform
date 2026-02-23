import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  preview: {
    // TanStack Start prerender spins up `vite preview` internally.
    // In some Docker environments `localhost` can resolve to IPv6 (::1) while the
    // preview server binds IPv4-only, causing `ConnectionRefused` during prerender.
    host: "127.0.0.1",
  },
  plugins: [
    tailwindcss(),
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        // Status pages are data-driven (API + SQLite) so we avoid build-time prerendering.
        enabled: false,
      },
    }),
    // React plugin must come after tanstackStart()
    react(),
  ],
});
