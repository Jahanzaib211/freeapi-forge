#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: ./restore.sh <backup_file.sql.gz>"
  exit 1
fi

echo "[$(date)] Restoring from $1..."
gunzip -c "$1" | docker exec -i forge-studio-postgres psql -U forge forge_studio
echo "[$(date)] Restore complete! Restart app: docker restart forge-studio-app"
