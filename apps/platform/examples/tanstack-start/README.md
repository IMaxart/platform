# TanStack Start Example

Integration with TanStack Start (React SSR framework).

## Setup

```bash
npm install @imaxart/analytics
```

## Integration

```tsx
// src/lib/analytics.ts
import { analytics } from '@imaxart/analytics'

if (typeof window !== 'undefined') {
  analytics.init({
    domain: import.meta.env.VITE_ANALYTICS_DOMAIN ?? 'analytics.yourdomain.com',
    environment: import.meta.env.MODE,
    trackPageViews: false, // We use TanStack Router integration instead
  })
}

export { analytics }
```

```tsx
// src/routes/__root.tsx
import { enableTanStackRouterTracking } from '@imaxart/analytics/react'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'

import { router } from '~/router'

function RootComponent() {
  useEffect(() => {
    const cleanup = enableTanStackRouterTracking(router)
    return cleanup
  }, [])

  return <Outlet />
}

export const Route = createRootRoute({
  component: RootComponent,
})
```

```tsx
// src/routes/index.tsx
import { useAnalytics } from '@imaxart/analytics/react'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { track } = useAnalytics()

  return <button onClick={() => track('hero_click')}>Get Started</button>
}
```

## Environment Variables

```env
VITE_ANALYTICS_DOMAIN=analytics.yourdomain.com
```

## What it demonstrates

- TanStack Router integration with `enableTanStackRouterTracking`
- SSR-safe initialization
- File-based route tracking
- Custom event tracking with hooks
