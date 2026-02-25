# AGENTS.md

## Forms

All forms use `@tanstack/react-form` (`useForm` + `form.Field`).
Never use `useState` to manage form state.

## Translations (i18n)

Every user-facing string must use paraglide: `m.key_name()` from `~/paraglide/messages`.
This includes labels, placeholders, error messages, button text, and status labels.
Raw API values (roles, statuses) must be mapped to translation keys before display.

## Quality gate

Run before every commit: `pnpm format`, `pnpm lint`, `pnpm type-check`.
Do not commit if any step fails.
