# IMaxart Analytics

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/IMaxart/analytics/actions/workflows/ci.yml/badge.svg)](https://github.com/IMaxart/analytics/actions/workflows/ci.yml)

Privacy-first, self-hosted web analytics platform. A lightweight alternative to Google Analytics that respects user privacy while giving you full control over your data.

## Why IMaxart Analytics?

- **Privacy by design** -- no cookies, hashed IPs with daily rotation, approximate geolocation. GDPR/RODO compliant out of the box.
- **Self-hosted** -- your data stays on your infrastructure. No third-party services.
- **Lightweight** -- tracking script is ~5KB gzipped. Minimal impact on page load.
- **Full-featured** -- visitors, page views, custom events, console errors, sessions, feature flags, bot detection, device exclusion.
- **Developer-friendly** -- TypeScript SDK with React hooks, TanStack Router and Next.js adapters, dark/light mode, i18n (EN/PL).

### How it compares

| Feature                | IMaxart Analytics | Plausible | Umami | PostHog |
| ---------------------- | ----------------- | --------- | ----- | ------- |
| Self-hosted            | Yes               | Yes       | Yes   | Yes     |
| No cookies             | Yes               | Yes       | Yes   | No      |
| Custom events          | Yes               | Yes       | Yes   | Yes     |
| Console error tracking | Yes               | No        | No    | Yes     |
| Feature flags          | Yes               | No        | No    | Yes     |
| TypeScript SDK         | Yes               | No        | No    | Yes     |
| Open source license    | AGPL-3.0          | AGPL-3.0  | MIT   | MIT     |

## Quick Start

### Self-hosting with Docker Compose

1. Clone the repository:

```bash
git clone https://github.com/IMaxart/analytics.git
cd analytics
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env -- set HASH_SECRET to a random 32+ character string
# Set ADMIN_DOMAIN to your analytics domain
```

3. Start the services:

```bash
docker compose up -d
```

The application will be available at `http://localhost:3000` (or the port you configured via `HOST_PORT`).

### Environment Variables

| Variable            | Description                          | Default                                                     |
| ------------------- | ------------------------------------ | ----------------------------------------------------------- |
| `DATABASE_URL`      | PostgreSQL connection string         | `postgresql://analytics:analytics@localhost:5432/analytics` |
| `HASH_SECRET`       | Secret for IP hashing (min 32 chars) | `change-me-to-a-random-secret`                              |
| `PORT`              | Application port (inside container)  | `3000`                                                      |
| `HOST_PORT`         | Host port mapping                    | `3000`                                                      |
| `ADMIN_DOMAIN`      | Main admin dashboard domain          | `localhost`                                                 |
| `POSTGRES_USER`     | Database username                    | `analytics`                                                 |
| `POSTGRES_PASSWORD` | Database password                    | `analytics`                                                 |
| `POSTGRES_DB`       | Database name                        | `analytics`                                                 |

## SDK

Install the analytics SDK in your website:

```bash
pnpm add @imaxart/analytics
```

### Basic Usage

```typescript
import { analytics } from '@imaxart/analytics'

analytics.init({ domain: 'analytics.yourdomain.com' })
analytics.track('button_click', { buttonId: 'cta' })
```

### React Hooks

```typescript
import { useAnalytics, useFeatureFlag } from '@imaxart/analytics/react'

const { track } = useAnalytics()
const showBanner = useFeatureFlag('promo-banner')
```

### Framework Adapters

**TanStack Router:**

```typescript
import { enableTanStackRouterTracking } from '@imaxart/analytics/react'

analytics.init({ domain: '...', trackPageViews: false })
enableTanStackRouterTracking(router)
```

**Next.js:**

```typescript
import { useNextPageTracking } from '@imaxart/analytics/react'
import { usePathname } from 'next/navigation'

const pathname = usePathname()
useNextPageTracking(pathname)
```

See the [SDK documentation](packages/analytics/README.md) for full API reference.

## Tech Stack

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [TanStack Start](https://tanstack.com/start) (React SSR)
- **Database:** PostgreSQL 17 + [Drizzle ORM](https://orm.drizzle.team/)
- **UI:** [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/) v4
- **Charts:** [Recharts](https://recharts.org/)
- **Validation:** [Zod](https://zod.dev/)
- **i18n:** react-i18next (English, Polish)

## Development

```bash
bun install
cp .env.example .env
bun run dev
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full development setup instructions.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Client Site    │────▶│   /api/collect    │
│  (SDK / t.js)    │     │   /api/flags      │
└─────────────────┘     └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │   PostgreSQL 17   │
                        │   (Drizzle ORM)   │
                        └────────┬─────────┘
                                 │
                        ┌────────▼─────────┐
                        │    Dashboard      │
                        │  (TanStack Start) │
                        └──────────────────┘
```

Multi-tenant: each client site gets its own subdomain (e.g., `analytics.example.com`) with isolated data views.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).

The SDK package (`@imaxart/analytics`) is licensed under the [MIT License](packages/analytics/LICENSE).
