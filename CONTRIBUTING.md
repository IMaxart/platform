# Contributing to IMaxart Analytics

Thank you for your interest in contributing! This document covers everything you need to get started.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- [Docker](https://www.docker.com/) and Docker Compose (for the database)
- [Node.js](https://nodejs.org/) v20+ (for SDK consumers and some tooling)

### Getting Started

1. Fork and clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/analytics.git
cd analytics
```

2. Install dependencies:

```bash
bun install
```

3. Copy the environment file and configure:

```bash
cp .env.example .env
```

4. Start the database:

```bash
docker compose up db -d
```

5. Run database migrations:

```bash
bun run db:migrate
```

6. Seed demo data (optional):

```bash
bun run db:seed
```

7. Start the development server:

```bash
bun run dev
```

### Building the SDK

```bash
bun run build:sdk
```

## Git Workflow

### Branch Model

We use **GitHub Flow** -- a simple branch-based workflow:

- `production` is the stable, deployable branch. Never push directly to it.
- All work happens in short-lived feature branches that branch off `production`.
- Every change enters `production` through a Pull Request.

### Branch Naming

Use prefixed branch names that describe intent:

| Prefix      | Purpose                   | Example                     |
| ----------- | ------------------------- | --------------------------- |
| `feat/`     | New feature or capability | `feat/session-replay`       |
| `fix/`      | Bug fix                   | `fix/timezone-offset`       |
| `chore/`    | Build, CI, deps, config   | `chore/upgrade-drizzle`     |
| `docs/`     | Documentation only        | `docs/sdk-quickstart`       |
| `refactor/` | Code restructuring        | `refactor/query-layer`      |
| `test/`     | Adding or fixing tests    | `test/collector-unit-tests` |

### Workflow

```bash
git checkout production
git pull origin production
git checkout -b feat/my-feature

# ... make changes, commit ...

git push -u origin feat/my-feature
# Open a Pull Request against `production`
```

### Branch Protection (recommended)

Repository maintainers should enable these rules on `production`:

- Require pull request reviews (at least 1 approval)
- Require CI status checks to pass
- Require branches to be up-to-date before merging
- No direct pushes

## Versioning

We follow [Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`):

| Increment | When                                                                   | Examples                                                               |
| --------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **MAJOR** | Breaking API changes, breaking schema migrations, SDK breaking changes | Removing an API endpoint, renaming DB columns, changing SDK public API |
| **MINOR** | New features, new non-breaking DB migrations, new SDK capabilities     | New dashboard page, new schema column, new SDK method                  |
| **PATCH** | Bug fixes, performance improvements, documentation                     | Fix query bug, optimize endpoint, update README                        |

### Release Process

1. Ensure `production` is stable and all CI checks pass.
2. Update `CHANGELOG.md` with the new version and changes.
3. Update `version` in `package.json` (and `packages/analytics/package.json` if SDK changed).
4. Commit: `chore: release vX.Y.Z`
5. Tag the release: `git tag vX.Y.Z`
6. Push tag: `git push origin vX.Y.Z`
7. Create a GitHub Release from the tag with changelog notes.

## Database Migrations

We use [Drizzle ORM](https://orm.drizzle.team/) with versioned SQL migrations.

### Development Workflow

1. Modify the schema in `src/lib/db/schema.ts`.
2. Generate a migration:

```bash
bun run db:generate
```

This creates a new SQL file in `src/lib/db/migrations/`.

3. Review the generated SQL to ensure correctness.
4. Apply the migration locally:

```bash
bun run db:migrate
```

5. Commit the schema change AND the generated migration file together.

### Production

Migrations run automatically on application startup. Drizzle applies all pending migrations in order, so version jumps (e.g., upgrading from v1.0 to v1.5) are handled safely.

### Rules

- **Never** use `db:push` in production -- it bypasses migration history.
- **Always** commit generated migration files -- they are the source of truth for production schema state.
- **Never** manually edit generated migration SQL unless absolutely necessary (and document why).
- If a migration needs to be reverted, create a new migration that undoes the change.

## Code Style

This project uses strict coding standards enforced by automated tooling:

- **TypeScript** with strict mode -- zero `any` types
- **ESLint** with strict rules and import sorting (`eslint-plugin-perfectionist`)
- **Prettier** for formatting with Tailwind CSS plugin

### Before Submitting

Run all checks locally:

```bash
bun run format:check
bun run lint
bun run type-check
bun run test
bun run build
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type: short description
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

- `feat: add session replay tracking`
- `fix: correct timezone offset calculation`
- `docs: update SDK installation guide`
- `test: add collector batch flush tests`

## Pull Request Process

1. Create a feature branch from `production` (see [Branch Naming](#branch-naming)).
2. Make your changes and ensure all checks pass (see [Before Submitting](#before-submitting)).
3. Push and open a Pull Request against `production`.
4. Fill out the PR template completely -- pay attention to the migration and breaking changes sections.
5. Wait for review. Address any feedback.
6. Once approved and CI passes, the PR will be merged.

## Project Structure

```
analytics/
├── src/                    # Main application (TanStack Start)
│   ├── components/         # React components
│   ├── lib/                # Utilities, DB, validation
│   │   └── db/
│   │       ├── schema.ts   # Drizzle schema (source of truth)
│   │       └── migrations/ # Versioned SQL migrations
│   ├── routes/             # File-based routes
│   └── i18n/               # Translations (EN + PL)
├── packages/
│   └── analytics/          # @imaxart/analytics SDK (published to npm)
│       └── src/
│           ├── react/      # React hooks and adapters
│           └── ...         # Core SDK modules
├── tracker/                # Lightweight tracking script
├── server.ts               # Custom Bun production server
├── Dockerfile              # Multi-stage Docker build
└── docker-compose.yml      # Docker Compose deployment
```

## License

By contributing, you agree that your contributions will be licensed under the [AGPL-3.0 License](LICENSE).
