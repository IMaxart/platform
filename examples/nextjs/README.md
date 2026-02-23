# Next.js App Router Example

Integration with Next.js 14+ App Router.

## Setup

```bash
npx create-next-app@latest my-app --typescript
cd my-app
npm install @imaxart/analytics
```

## Integration

```tsx
// lib/analytics.ts
import { analytics } from '@imaxart/analytics'

if (typeof window !== 'undefined') {
  analytics.init({
    domain:
      process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN ?? 'analytics.yourdomain.com',
    environment: process.env.NODE_ENV,
    trackPageViews: false, // We use the Next.js hook instead
  })
}

export { analytics }
```

```tsx
// app/layout.tsx
import { AnalyticsProvider } from './analytics-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider />
        {children}
      </body>
    </html>
  )
}
```

```tsx
// app/analytics-provider.tsx
'use client'

import { useNextPageTracking } from '@imaxart/analytics/react'

export function AnalyticsProvider() {
  useNextPageTracking()
  return null
}
```

```tsx
// app/page.tsx
'use client'

import { useAnalytics } from '@imaxart/analytics/react'

export default function Home() {
  const { track } = useAnalytics()

  return <button onClick={() => track('signup_click')}>Sign Up</button>
}
```

## Environment Variables

```env
NEXT_PUBLIC_ANALYTICS_DOMAIN=analytics.yourdomain.com
```

## What it demonstrates

- SSR-safe initialization
- Next.js App Router page view tracking with `useNextPageTracking`
- Client component event tracking
- Environment variable configuration
