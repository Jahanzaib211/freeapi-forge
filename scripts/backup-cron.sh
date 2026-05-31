#!/bin/bash
# Add to crontab: 0 2 * * * /path/to/backup-cron.sh
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="/var/backups/forge-studio"
"$SCRIPT_DIR/backup.sh" "$BACKUP_DIR" >> /var/log/forge-backup.log 2>&1
