#!/usr/bin/env bash
# ─── HOP Setup Script ─────────────────────────────────────────────────────────
# Quick dev environment setup
set -euo pipefail

echo "🚀 Setting up HOP development environment..."

# Check pnpm
if ! command -v pnpm &>/dev/null; then
  echo "📦 Installing pnpm..."
  corepack enable
  corepack prepare pnpm@9.1.0 --activate
fi

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Copy .env if not exists
if [ ! -f .env ]; then
  echo "⚙️  Creating .env from .env.example..."
  cp .env.example .env
  echo ""
  echo "⚠️  Please edit .env and set the required secrets before continuing:"
  echo "   - JWT_SECRET (min 32 chars)"
  echo "   - JWT_REFRESH_SECRET (min 32 chars)"
  echo "   - ENCRYPTION_KEY (32 hex chars)"
  echo ""
fi

# Build shared packages
echo "🔨 Building shared packages..."
pnpm --filter @hop/tsconfig build 2>/dev/null || true
pnpm --filter @hop/shared-types build
pnpm --filter @hop/plugin-sdk build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your database/Redis credentials and JWT secrets"
echo "  2. Start the database: docker compose up -d postgres redis"
echo "  3. Run migrations:     cd apps/api && pnpm db:migrate:dev && pnpm db:seed"
echo "  4. Start dev servers:  pnpm dev  (from repo root)"
echo ""
echo "Or run the full stack with Docker:"
echo "  docker compose up -d"
