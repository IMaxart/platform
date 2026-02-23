# IMaxart Platform

[![CI](https://github.com/IMaxart/platform/actions/workflows/ci.yml/badge.svg)](https://github.com/IMaxart/platform/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

Self-hosted infrastructure platform for web analytics, error tracking, feature flags, and status monitoring. Privacy-first, open source, zero third-party dependencies for data collection.

## Architecture

```
apps/
  platform/    @platform/app      — Main dashboard (analytics, errors, flags, config)
  status/      @platform/status   — Public status page (uptime, incidents)

packages/
  ui/          @platform/ui       — Shared shadcn/ui components
  db/          @platform/db       — Drizzle ORM schemas + migrations (PostgreSQL)
  shared/      @platform/shared   — Shared types, Zod schemas, helpers
  sdk/         @imaxart/platform  — Client SDK (npm, MIT licensed)
  auth/        @platform/auth     — Authentication (scaffold)
  tsconfig/    @platform/tsconfig — Shared TypeScript configs
```

## Quick Start

### Docker (recommended)

```bash
cp .env.example .env
docker compose up
```

- Platform: `http://localhost:3000`
- Status: `http://localhost:3001`

### Development

Prerequisites: [Bun](https://bun.sh) (runtime), [pnpm](https://pnpm.io) v10+, [Node.js](https://nodejs.org) v22+

```bash
git clone git@github.com:IMaxart/platform.git
cd platform
pnpm install
pnpm dev
```

This starts both apps in development mode via Turborepo.

### Database

```bash
pnpm db:push      # Push schema to dev database
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio
```

## Tech Stack

| Layer           | Technology                                |
| --------------- | ----------------------------------------- |
| Runtime         | Bun                                       |
| Package manager | pnpm (workspaces)                         |
| Monorepo        | Turborepo                                 |
| Framework       | TanStack Start (React 19 SSR)             |
| Database        | Drizzle ORM + PostgreSQL 17               |
| UI              | shadcn/ui + Tailwind CSS v4 + Radix UI    |
| Validation      | Zod                                       |
| State           | Jotai                                     |
| Animations      | Motion                                    |
| Testing         | Vitest                                    |
| Linting         | ESLint 9 (strict) + Prettier (OXC parser) |
| CI              | GitHub Actions                            |
| Deploy          | Docker Compose + Traefik                  |

## SDK

Install the client SDK for your website:

```bash
npm install @imaxart/platform
```

```typescript
import { createAnalytics } from '@imaxart/platform/analytics'

const analytics = createAnalytics({ endpoint: 'https://platform.example.com' })
analytics.trackPageView()
```

React integration:

```typescript
import {
  AnalyticsProvider,
  useAnalytics,
} from '@imaxart/platform/analytics/react'
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and PR process.

## License

- Platform: [AGPL-3.0](LICENSE)
- SDK (`@imaxart/platform`): [MIT](packages/sdk/LICENSE)
