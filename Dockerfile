FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/
COPY packages/js/package.json packages/js/
RUN pnpm install --frozen-lockfile --filter @tsproxy/api --filter @tsproxy/js

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/js/node_modules ./packages/js/node_modules
COPY packages/api packages/api
COPY packages/js packages/js
COPY tsconfig.base.json ./
RUN pnpm --filter @tsproxy/js build && pnpm --filter @tsproxy/api build

# Production
FROM node:22-slim AS runner
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /app/packages/api/dist ./dist
COPY --from=build /app/packages/api/package.json ./
COPY --from=deps /app/packages/api/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/server.js"]
