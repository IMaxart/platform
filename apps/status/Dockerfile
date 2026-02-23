FROM oven/bun:1.3.8 AS build

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build


FROM oven/bun:1.3.8 AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/server.ts /app/server.ts
COPY --from=build /app/src /app/src
COPY --from=build /app/dist /app/dist
COPY --from=build /app/public /app/public

ENV STATUS_DB_PATH=/data/status.sqlite

EXPOSE 3000

CMD ["bun", "run", "server.ts"]

