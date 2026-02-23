import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export function getRouter() {
  const router = createRouter({
    defaultPreload: 'intent',
    routeTree,
    scrollRestoration: true,
  })

  return router
}

declare module '@tanstack/react-router' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- TanStack Router requires interface for module augmentation
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
