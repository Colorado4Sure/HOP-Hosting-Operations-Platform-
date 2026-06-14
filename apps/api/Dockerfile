# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/plugin-sdk/package.json ./packages/plugin-sdk/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .

# Build shared packages first
RUN pnpm --filter @hop/tsconfig build || true
RUN pnpm --filter @hop/shared-types build
RUN pnpm --filter @hop/plugin-sdk build

# Generate Prisma client
RUN pnpm --filter @hop/api db:generate

# Build the API
RUN pnpm --filter @hop/api build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup -g 1001 -S hopgroup && adduser -S hopuser -u 1001 -G hopgroup

# Copy production node_modules and build artifacts
COPY --from=builder --chown=hopuser:hopgroup /app/apps/api/dist ./dist
COPY --from=builder --chown=hopuser:hopgroup /app/apps/api/prisma ./prisma
COPY --from=builder --chown=hopuser:hopgroup /app/node_modules ./node_modules
COPY --from=builder --chown=hopuser:hopgroup /app/packages/shared-types/dist ./packages/shared-types/dist

USER hopuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
