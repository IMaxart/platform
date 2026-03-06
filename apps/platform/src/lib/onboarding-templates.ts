type SnippetParams = {
  domain: string
  platformHost?: string
}

export const getInstallCommand = () => 'pnpm add @imaxart/analytics'

export const getVanillaJsSnippet = ({ domain, platformHost }: SnippetParams) =>
  `<script defer data-domain="${domain}" src="https://${platformHost ?? domain}/t.js"></script>`

export const getTanStackStartSnippet = ({ domain }: SnippetParams) =>
  `import { analytics } from '@imaxart/analytics'
import { enableTanStackRouterTracking } from '@imaxart/analytics/react'
import { router } from './router'

analytics.init({
  domain: '${domain}',
  trackPageViews: false,
})

enableTanStackRouterTracking(router)`

export const getNextJsSnippet = ({ domain }: SnippetParams) =>
  `// app/layout.tsx
'use client'

import { analytics } from '@imaxart/analytics'
import { useNextPageTracking } from '@imaxart/analytics/react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

analytics.init({
  domain: '${domain}',
  trackPageViews: false,
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  useNextPageTracking(pathname)

  return <html><body>{children}</body></html>
}`

export const getViteReactSnippet = ({ domain }: SnippetParams) =>
  `// main.tsx
import { analytics } from '@imaxart/analytics'

analytics.init({
  domain: '${domain}',
})`

export const getEnvTemplate = ({ domain }: SnippetParams) =>
  `# Analytics Configuration
NEXT_PUBLIC_ANALYTICS_DOMAIN=${domain}
# or for Vite:
VITE_ANALYTICS_DOMAIN=${domain}`

export const getAiSetupGuide = ({ domain }: SnippetParams) =>
  `# Analytics Integration Guide

## Overview
This guide describes how to integrate IMaxart Analytics into your web application.
The analytics endpoint is: https://${domain}

## Quick Start

### 1. Install the SDK
\`\`\`bash
pnpm add @imaxart/analytics
\`\`\`

### 2. Initialize in your app entry point
\`\`\`typescript
import { analytics } from '@imaxart/analytics'

analytics.init({
  domain: '${domain}',
})
\`\`\`

### 3. Track custom events (optional)
\`\`\`typescript
analytics.track('button_click', { buttonId: 'cta', variant: 'blue' })
\`\`\`

### 4. Feature flags (optional)
\`\`\`typescript
const enabled = await analytics.getFlag('new-feature')
\`\`\`

## Framework-Specific Setup

### TanStack Start / TanStack Router
Use \`enableTanStackRouterTracking(router)\` for accurate page view tracking.
Set \`trackPageViews: false\` in init to avoid duplicate history-based tracking.

### Next.js (App Router)
Use the \`useNextPageTracking(pathname)\` hook in your root layout.
Set \`trackPageViews: false\` in init.

### Vite + React (SPA)
Default \`trackPageViews: true\` handles History API patching automatically.
No additional setup needed.

## Configuration Options
- \`trackPageViews\`: Auto-track page views (default: true)
- \`trackErrors\`: Capture console errors (default: true)
- \`respectDNT\`: Respect Do Not Track (default: true)

## Privacy
- No cookies used
- IPs are hashed with per-project salt and daily rotation
- GDPR/RODO compliant by design
`
