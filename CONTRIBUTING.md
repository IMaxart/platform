# Contributing to IMaxart Platform

Thank you for your interest in contributing! This guide will help you get started.

## Development Environment

### Prerequisites

- [Bun](https://bun.sh) v1.3+ (runtime)
- [pnpm](https://pnpm.io) v10+ (package manager)
- [Node.js](https://nodejs.org) v22+ (for tooling)
- [Docker](https://www.docker.com/) or [OrbStack](https://orbstack.dev/) (for PostgreSQL)

### Setup

```bash
git clone git@github.com:IMaxart/platform.git
cd platform
pnpm install

# Start PostgreSQL
docker compose up postgres -d

# Push schema to dev database
pnpm db:push

# Start development
pnpm dev
```

## Branch Naming

Use prefixed branch names:

- `feat/` — New features
- `fix/` — Bug fixes
- `docs/` — Documentation changes
- `chore/` — Maintenance, deps, tooling
- `refactor/` — Code restructuring

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add analytics export feature
fix: correct timezone offset in session tracking
docs: update SDK integration guide
chore: bump drizzle-orm to 0.46
```

## Pull Request Process

1. Create a branch from `production`
2. Make your changes
3. Run quality checks locally:

```bash
pnpm format
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

4. Push and open a PR against `production`
5. Fill in the PR template
6. Wait for CI to pass and request a review

## Code Style

Code style is fully automated:

- **Prettier** formats all code (with OXC parser for speed and Tailwind class sorting)
- **ESLint** enforces strict TypeScript rules, import ordering, and React best practices
- **TypeScript** is configured at maximum strictness (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.)

Do not debate style in reviews. If Prettier and ESLint pass, the style is correct.

## Database Migrations

If you change the Drizzle schema:

1. Run `pnpm db:generate` to create a migration file
2. Review the generated SQL in `packages/db/migrations/`
3. Commit the migration file with your PR
4. CI will verify that migrations are committed

## Testing

- Write tests for new features
- Tests use Vitest with happy-dom
- Run `pnpm test` to execute all tests
- Run `pnpm bench` for benchmark tests
