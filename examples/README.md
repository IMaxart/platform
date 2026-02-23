# Examples

Example integrations of `@imaxart/analytics` across different frameworks.

| Example                             | Framework                 | SDK Features                    |
| ----------------------------------- | ------------------------- | ------------------------------- |
| [vanilla-js](./vanilla-js/)         | Plain HTML                | Core SDK, custom events         |
| [react-vite-ts](./react-vite-ts/)   | React + Vite + TypeScript | React hooks, feature flags      |
| [nextjs](./nextjs/)                 | Next.js App Router        | `useNextPageTracking`, SSR-safe |
| [tanstack-start](./tanstack-start/) | TanStack Start            | `enableTanStackRouterTracking`  |
| [vue](./vue/)                       | Vue 3 + Vue Router        | Core SDK, manual page views     |
| [nuxt](./nuxt/)                     | Nuxt 3                    | Client plugin, runtime config   |

## Common Setup

All examples assume you have a running IMaxart Analytics instance. Replace `analytics.yourdomain.com` with your actual analytics domain.

## React vs Non-React

- **React apps** (React Vite, Next.js, TanStack Start): Use `@imaxart/analytics/react` for hooks and framework integrations.
- **Non-React apps** (Vanilla, Vue, Nuxt): Use `@imaxart/analytics` core SDK directly.
