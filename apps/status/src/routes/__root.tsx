import type { ReactNode } from 'react'

import { ThemeProvider, themeScript } from '@platform/ui'
import { TooltipProvider } from '@platform/ui/components/tooltip'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'

import Header from '~/components/header'

import appCss from '~/styles/globals.css?url'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  head: () => ({
    links: [
      {
        href: appCss,
        rel: 'stylesheet',
      },
    ],
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        content: 'width=device-width, initial-scale=1',
        name: 'viewport',
      },
      {
        title: 'Status',
      },
    ],
    scripts: [
      {
        children: themeScript,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-background text-foreground min-h-screen antialiased">
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TooltipProvider>
              <Header />
              {children}
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  )
}
