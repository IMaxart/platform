# AGENTS.md

## Git

Author for all commits: `Ingram Kalina <ingram.kalina@imaxart.com>`

Branch naming: conventional, English, kebab-case. Examples: `feat/user-invitation`, `fix/session-timezone-offset`, `chore/bump-drizzle`.

## Forms

All forms use `@tanstack/react-form` (`useForm` + `form.Field`).
Never use `useState` to manage form state.

## Translations (i18n)

Every user-facing string must use paraglide: `m.key_name()` from `~/paraglide/messages`.
Raw API values (roles, statuses) must be mapped to translation keys before display.

## Quality gate

Run before every commit: `pnpm format`, `pnpm lint`, `pnpm type-check`.
Do not commit if any step fails.

## Cursor Cloud specific instructions

- `routeTree.gen.ts` is auto-generated on `pnpm dev` / `pnpm build`. Run either before `pnpm type-check`.
- Admin user is not seeded in dev mode. Seed manually: `node --import tsx -e "const { seedAdmin } = await import('./packages/auth/src/seed-admin.js'); await seedAdmin(); process.exit(0)"` (env vars from `.env`).
- `docker-compose.yml` does not expose PostgreSQL port to host. Override with `-f - <<< $'services:\n  postgres:\n    ports:\n      - "5432:5432"'`.
