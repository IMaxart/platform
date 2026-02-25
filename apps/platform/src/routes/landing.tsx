import { Button } from '@platform/ui/components/button'
import { Card, CardContent } from '@platform/ui/components/card'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  BarChart3,
  Code2,
  Globe,
  Lock,
  Server,
  Shield,
  Zap,
} from 'lucide-react'

import * as m from '~/paraglide/messages'

export const Route = createFileRoute('/landing')({
  component: LandingPage,
})

const FEATURES = [
  {
    description:
      'No cookies, hashed IPs, DNT respect. Fully GDPR/RODO compliant out of the box.',
    icon: Shield,
    title: 'Privacy-first',
  },
  {
    description:
      'Deploy on your own infrastructure. Your data never leaves your servers.',
    icon: Server,
    title: 'Self-hosted',
  },
  {
    description:
      'Lightweight SDK under 5KB gzip. Zero impact on your site performance.',
    icon: Zap,
    title: 'Fast & lightweight',
  },
  {
    description:
      'Page views, sessions, events, errors, feature flags -- all in one platform.',
    icon: BarChart3,
    title: 'Complete analytics',
  },
  {
    description:
      'Each client site gets its own subdomain. No CORS issues, clean separation.',
    icon: Globe,
    title: 'Multi-tenant',
  },
  {
    description:
      'TypeScript SDK with React hooks, TanStack Router, Next.js, and Vue support.',
    icon: Code2,
    title: 'Developer-friendly',
  },
] as const

type ComparisonRow = {
  feature: string
  ga: boolean
  ours: boolean
  plausible: boolean
}

const COMPARISON: ComparisonRow[] = [
  {
    feature: 'Privacy-first (no cookies)',
    ga: false,
    ours: true,
    plausible: true,
  },
  { feature: 'Self-hosted', ga: false, ours: true, plausible: true },
  { feature: 'Custom events', ga: true, ours: true, plausible: true },
  { feature: 'Error tracking', ga: false, ours: true, plausible: false },
  { feature: 'Feature flags', ga: false, ours: true, plausible: false },
  { feature: 'Multi-environment', ga: false, ours: true, plausible: false },
  { feature: 'Open source (AGPL)', ga: false, ours: true, plausible: true },
  { feature: 'Free forever', ga: true, ours: true, plausible: false },
]

function LandingPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <Lock className="h-5 w-5" />
            <span className="text-lg font-semibold tracking-tight">
              {m.landing_brandName()}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a
              className="text-muted-foreground hover:text-foreground text-sm transition-colors duration-200"
              href="https://github.com/IMaxart/analytics"
              rel="noopener noreferrer"
              target="_blank"
            >
              {m.landing_github()}
            </a>
            <Link to="/">
              <Button size="sm">{m.landing_dashboard()}</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32">
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          {m.landing_heroTitle()}
          <br />
          <span className="text-muted-foreground">
            {m.landing_heroSubtitle()}
          </span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-lg leading-relaxed">
          {m.landing_heroDescription()}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="https://github.com/IMaxart/analytics"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button className="h-11 px-6" size="lg">
              {m.landing_getStarted()}
            </Button>
          </a>
          <a
            href="https://github.com/IMaxart/analytics#readme"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button className="h-11 px-6" size="lg" variant="outline">
              {m.landing_documentation()}
            </Button>
          </a>
        </div>
      </section>

      <section className="border-t py-24">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {m.landing_featuresTitle()}
          </h2>
          <p className="text-muted-foreground mx-auto mb-16 max-w-lg text-center">
            {m.landing_featuresDescription()}
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card
                className="transition-all duration-300 ease-out hover:shadow-md"
                key={f.title}
              >
                <CardContent className="p-8">
                  <f.icon className="text-foreground mb-4 h-6 w-6" />
                  <h3 className="mb-2 font-semibold">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {f.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t py-24">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {m.landing_comparisonTitle()}
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-md text-center">
            {m.landing_comparisonDescription()}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 pr-4 text-left font-medium">
                    {m.landing_feature()}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    {m.landing_imaxart()}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    {m.landing_googleAnalytics()}
                  </th>
                  <th className="px-4 py-3 text-center font-medium">
                    {m.landing_plausible()}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr className="border-b last:border-0" key={row.feature}>
                    <td className="py-3 pr-4">{row.feature}</td>
                    <td className="px-4 py-3 text-center">
                      {row.ours ? '\u2705' : '\u274c'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.ga ? '\u2705' : '\u274c'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.plausible ? '\u2705' : '\u274c'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-t py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="mb-4 text-center text-2xl font-semibold tracking-tight md:text-3xl">
            {m.landing_quickStartTitle()}
          </h2>
          <p className="text-muted-foreground mx-auto mb-12 max-w-md text-center">
            {m.landing_quickStartDescription()}
          </p>
          <div className="space-y-6">
            <div className="bg-muted overflow-x-auto rounded-lg p-6">
              <pre className="text-sm leading-relaxed">
                <code>{`# Clone the repository
git clone https://github.com/IMaxart/analytics.git
cd analytics

# Configure environment
cp .env.example .env

# Start with Docker Compose
docker compose up -d

# Open http://localhost:3000`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t py-12">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-muted-foreground text-sm">
            {m.landing_footerLicense()} &middot;{' '}
            <a
              className="hover:text-foreground underline transition-colors duration-200"
              href="https://github.com/IMaxart/analytics"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
