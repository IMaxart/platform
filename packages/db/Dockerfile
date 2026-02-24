FROM node:22-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/platform/package.json ./apps/platform/
COPY apps/status/package.json ./apps/status/
COPY packages/db/package.json ./packages/db/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared/package.json ./packages/shared/
COPY packages/auth/package.json ./packages/auth/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

COPY packages/db/ ./packages/db/
COPY packages/tsconfig/ ./packages/tsconfig/

WORKDIR /app/packages/db
CMD ["npx", "drizzle-kit", "push", "--force"]
