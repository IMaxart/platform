/// <reference types="vite/client" />

import type { ReactNode } from 'react'

import { SidebarInset, SidebarProvider } from '@platform/ui/components/sidebar'
import { TooltipProvider } from '@platform/ui/components/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'

import { AppSidebar } from '~/components/layout/app-sidebar'
import { ThemeProvider } from '~/components/theme-provider'
import { initI18n } from '~/i18n/config'

import appCss from '~/styles/app.css?url'

void initI18n()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export const Route = createRootRoute({
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
      { title: 'Analytics' },
      { content: 'Self-hosted, privacy-first analytics', name: 'description' },
    ],
    scripts: [
      {
        children: `
          (function() {
            var theme = localStorage.getItem('analytics-theme') || 'system';
            var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
            document.documentElement.classList.add(dark ? 'dark' : 'light');
          })();
        `,
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
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <Outlet />
              </SidebarInset>
            </SidebarProvider>
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
