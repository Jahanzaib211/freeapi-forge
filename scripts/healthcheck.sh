#!/bin/bash
# Forge Studio Health Check — runs every 2 minutes via cron
# If the server is down, restart it via systemctl

SERVICE="forge-studio"
HEALTH_URL="http://localhost:5051/health"
LOG_FILE="/home/jahanzaib/forge-studio/logs/healthcheck.log"

mkdir -p "$(dirname "$LOG_FILE")"

RESPONSE=$(curl -sf --connect-timeout 5 --max-time 10 "$HEALTH_URL" 2>/dev/null)
HTTP_CODE=$?

if [ $HTTP_CODE -ne 0 ] || ! echo "$RESPONSE" | grep -q '"status":"healthy"'; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEALTH CHECK FAILED (http_code=$HTTP_CODE). Restarting $SERVICE..." >> "$LOG_FILE"
    sudo systemctl restart "$SERVICE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $SERVICE restarted" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEALTH CHECK OK" >> "$LOG_FILE"
fi

# Keep log file under 1000 lines
tail -500 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
