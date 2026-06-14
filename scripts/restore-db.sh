#!/usr/bin/env bash
# ─── HOP Database Restore Script ──────────────────────────────────────────────
# Usage: ./scripts/restore-db.sh <backup_file>
# Restores a PostgreSQL backup created by backup-db.sh

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "❌ Usage: $0 <backup_file.sql.gz>"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Backup file not found: $BACKUP_FILE"
  exit 1
fi

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-hop_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-hop_password}"
POSTGRES_DB="${POSTGRES_DB:-hop_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

echo "⚠️  WARNING: This will REPLACE all data in '${POSTGRES_DB}'"
read -r -p "Type 'yes' to confirm: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo "🔄 Restoring ${BACKUP_FILE} → ${POSTGRES_DB}..."

# Drop and recreate the database
PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "DROP DATABASE IF EXISTS \"${POSTGRES_DB}\";"

PGPASSWORD="$POSTGRES_PASSWORD" psql \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d postgres \
  -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"

# Restore
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$POSTGRES_PASSWORD" pg_restore \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --exit-on-error

echo "✅ Restore complete!"
