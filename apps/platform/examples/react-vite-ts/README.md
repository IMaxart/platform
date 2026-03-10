# React + Vite + TypeScript Example

A minimal React + Vite + TypeScript setup with IMaxart Analytics.

## Setup

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @imaxart/analytics
```

## Integration

```tsx
// src/main.tsx
import { analytics } from '@imaxart/analytics'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

analytics.init({
  domain: {
    platform:
      import.meta.env.VITE_ANALYTICS_DOMAIN ?? 'platform.yourdomain.com',
    site: 'yourdomain.com',
  },
  environment: import.meta.env.MODE,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

```tsx
// src/App.tsx
import { useAnalytics, useFeatureFlag } from '@imaxart/analytics/react'

function App() {
  const { track } = useAnalytics()
  const isNewDesign = useFeatureFlag('new-design')

  return (
    <div>
      <h1>{isNewDesign ? 'New Design' : 'Classic Design'}</h1>
      <button onClick={() => track('cta_click', { variant: 'hero' })}>
        Click me
      </button>
    </div>
  )
}

export default App
```

## Environment Variables

```env
VITE_ANALYTICS_DOMAIN=platform.yourdomain.com
```

## What it demonstrates

- SDK initialization in entry point
- React hooks (`useAnalytics`, `useFeatureFlag`)
- Environment-based configuration
- Custom event tracking
