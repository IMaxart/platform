# Nuxt 3 Example

Integration with Nuxt 3. Uses the core SDK as a Nuxt plugin.

## Setup

```bash
npx nuxi@latest init my-app
cd my-app
npm install @imaxart/analytics
```

## Integration

```ts
// plugins/analytics.client.ts
import { analytics } from '@imaxart/analytics'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  analytics.init({
    domain: {
      platform: config.public.analyticsDomain as string,
      site: 'yourdomain.com',
    },
    environment: process.dev ? 'development' : 'production',
    trackPageViews: false,
  })

  const router = useRouter()
  router.afterEach((to) => {
    analytics.trackPageView(to.fullPath)
  })

  return {
    provide: {
      analytics,
    },
  }
})
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      analyticsDomain: 'platform.yourdomain.com',
    },
  },
})
```

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
const { $analytics } = useNuxtApp()

const handleClick = () => {
  $analytics.track('cta_click', { page: 'home' })
}
</script>

<template>
  <button @click="handleClick">Track Click</button>
</template>
```

## Environment Variables

```env
NUXT_PUBLIC_ANALYTICS_DOMAIN=platform.yourdomain.com
```

## What it demonstrates

- Nuxt 3 client-side plugin pattern (`.client.ts`)
- Runtime config for domain configuration
- Vue Router integration for page view tracking
- `useNuxtApp()` for accessing analytics in components
