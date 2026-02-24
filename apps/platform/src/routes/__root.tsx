/// <reference types="vite/client" />

import type { ReactNode } from 'react'

import { ThemeProvider, themeScript } from '@platform/ui'
import { SidebarInset, SidebarProvider } from '@platform/ui/components/sidebar'
import { TooltipProvider } from '@platform/ui/components/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  redirect,
  Scripts,
  useLocation,
} from '@tanstack/react-router'

import { AppSidebar } from '~/components/layout/app-sidebar'
import { getSession } from '~/lib/server/auth'

import appCss from '~/styles/app.css?url'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const PUBLIC_ROUTES = new Set([
  '/2fa/verify',
  '/forgot-password',
  '/landing',
  '/login',
  '/reset-password',
  '/setup',
])

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.has(pathname) ||
  pathname.startsWith('/api/') ||
  pathname.startsWith('/invite/')

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (isPublicRoute(location.pathname)) return { session: null }

    const session = await getSession()

    if (!session) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- TanStack Router redirect API
      throw redirect({ to: '/login' })
    }

    return { session }
  },
  component: RootComponent,
  head: () => ({
    links: [
      { href: appCss, rel: 'stylesheet' },
      {
        as: 'font',
        crossOrigin: 'anonymous',
        href: '/fonts/inter-400.woff2',
        rel: 'preload',
        type: 'font/woff2',
      },
    ],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      { title: 'IMaxart Platform' },
      {
        content: 'Self-hosted analytics & status monitoring platform',
        name: 'description',
      },
    ],
    scripts: [
      {
        children: themeScript,
      },
    ],
  }),
})

function RootComponent() {
  return (
    <RootDocument>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <RootLayout />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const location = useLocation()
  const isPublic = isPublicRoute(location.pathname)

  if (isPublic) {
    return <Outlet />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
