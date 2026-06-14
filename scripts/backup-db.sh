#!/usr/bin/env bash
# ─── HOP Database Backup Script ───────────────────────────────────────────────
# Usage: ./scripts/backup-db.sh [output_dir]
# Backs up the PostgreSQL database to a timestamped .sql.gz file.

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="hop_db_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${FILENAME}"

# Load .env if present
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

POSTGRES_USER="${POSTGRES_USER:-hop_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-hop_password}"
POSTGRES_DB="${POSTGRES_DB:-hop_db}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

mkdir -p "$BACKUP_DIR"

echo "🗄️  Backing up database '${POSTGRES_DB}' to ${BACKUP_PATH}..."

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner \
  --no-acl \
  --format=custom \
  | gzip > "$BACKUP_PATH"

echo "✅ Backup complete: ${BACKUP_PATH}"
echo "   Size: $(du -sh "$BACKUP_PATH" | cut -f1)"

# Keep only the last 30 backups
cd "$BACKUP_DIR"
ls -t hop_db_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm --
echo "🗑️  Old backups pruned (keeping last 30)"
