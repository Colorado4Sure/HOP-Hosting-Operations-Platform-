# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
COPY packages/ui/package.json ./packages/ui/
COPY apps/dashboard/package.json ./apps/dashboard/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build dependencies
RUN pnpm --filter @hop/tsconfig build || true
RUN pnpm --filter @hop/shared-types build

# Build the dashboard
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN pnpm --filter @hop/dashboard build

# ─── Stage 3: Production image ────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S hopgroup && adduser -S hopuser -u 1001 -G hopgroup

COPY --from=builder --chown=hopuser:hopgroup /app/apps/dashboard/.next/standalone ./
COPY --from=builder --chown=hopuser:hopgroup /app/apps/dashboard/.next/static ./apps/dashboard/.next/static
COPY --from=builder --chown=hopuser:hopgroup /app/apps/dashboard/public ./apps/dashboard/public

USER hopuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => process.exit(r.statusCode < 400 ? 0 : 1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/dashboard/server.js"]
