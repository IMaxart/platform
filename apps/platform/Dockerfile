FROM node:22-slim AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/platform/package.json ./apps/platform/
COPY packages/ui/package.json ./packages/ui/
COPY packages/db/package.json ./packages/db/
COPY packages/shared/package.json ./packages/shared/
COPY packages/auth/package.json ./packages/auth/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile

FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app ./
COPY . .
ENV NODE_ENV=production
RUN pnpm turbo build --filter=@platform/app

FROM oven/bun:1 AS runtime
WORKDIR /app/apps/platform
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=deps /app/apps/platform/node_modules /app/apps/platform/node_modules
COPY --from=deps /app/packages/db/node_modules /app/packages/db/node_modules
COPY --from=build /app/packages/db/src /app/packages/db/src
COPY --from=build /app/packages/db/package.json /app/packages/db/package.json
COPY --from=build /app/apps/platform/dist ./dist
COPY --from=build /app/apps/platform/public ./public
COPY --from=build /app/apps/platform/server.ts ./server.ts
COPY --from=build /app/apps/platform/package.json ./package.json

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["bun", "server.ts"]
