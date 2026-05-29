#!/bin/bash
set -e

BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[$(date)] Starting backup..."

# PostgreSQL backup
echo "[$(date)] Backing up PostgreSQL..."
docker exec forge-studio-postgres pg_dump -U forge forge_studio | gzip > "$BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"
echo "[$(date)] PostgreSQL backup saved: $BACKUP_DIR/postgres_$TIMESTAMP.sql.gz"

# Redis backup
echo "[$(date)] Backing up Redis..."
docker exec forge-studio-redis redis-cli BGSAVE
sleep 2
docker cp forge-studio-redis:/data/dump.rdb "$BACKUP_DIR/redis_$TIMESTAMP.rdb"
echo "[$(date)] Redis backup saved: $BACKUP_DIR/redis_$TIMESTAMP.rdb"

# Cleanup old backups (keep last 7)
cd "$BACKUP_DIR"
ls -t postgres_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm
ls -t redis_*.rdb 2>/dev/null | tail -n +8 | xargs -r rm

echo "[$(date)] Backup complete!"
