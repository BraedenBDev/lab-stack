# syntax=docker/dockerfile:1

# --- install dependencies (cached unless package.json/lockfile change) ---
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# --- build the React frontend into /app/dist ---
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

# --- runtime image: Hono server serves API + built SPA ---
FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
# node_modules includes drizzle-kit so migrations can run at deploy time
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY src ./src
COPY drizzle ./drizzle
COPY package.json drizzle.config.ts openapi.yaml ./
# Drop privileges: the oven/bun image ships a non-root `bun` user. Runtime needs
# only read access to these copied (root-owned, world-readable) files.
USER bun
EXPOSE 3000
CMD ["bun", "src/server/index.ts"]
