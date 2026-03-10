# Vue 3 Example

Integration with Vue 3. Uses the core SDK directly (no framework-specific hooks).

## Setup

```bash
npm create vue@latest my-app
cd my-app
npm install @imaxart/analytics
```

## Integration

```ts
// src/analytics.ts
import { analytics } from '@imaxart/analytics'

analytics.init({
  domain: {
    platform:
      import.meta.env.VITE_ANALYTICS_DOMAIN ?? 'platform.yourdomain.com',
  },
  environment: import.meta.env.MODE,
})

export { analytics }
```

```ts
// src/main.ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import { analytics } from './analytics'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    /* your routes */
  ],
})

router.afterEach((to) => {
  analytics.trackPageView(to.fullPath)
})

createApp(App).use(router).mount('#app')
```

```vue
<!-- src/App.vue -->
<script setup lang="ts">
import { analytics } from './analytics'

const handleClick = () => {
  analytics.track('button_click', { component: 'App' })
}
</script>

<template>
  <button @click="handleClick">Track Click</button>
</template>
```

## Environment Variables

```env
VITE_ANALYTICS_DOMAIN=platform.yourdomain.com
```

## What it demonstrates

- Core SDK usage (framework-agnostic, no React hooks)
- Vue Router integration for page view tracking
- Custom event tracking from Vue components
