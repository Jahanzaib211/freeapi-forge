#!/usr/bin/env bash
# Forge Studio — Stack startup orchestrator
# Ensures dependencies are healthy, then resurrects all PM2 processes.
# Designed to be called by systemd on boot.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_DIR}/logs/stack-startup.log"
SERVICES_CONF="${PROJECT_DIR}/services.conf"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "$msg" | tee -a "$LOG_FILE"
}

log "=== Forge Studio stack startup initiated ==="

# Step 1: Ensure dependencies
log "Running dependency checks..."
if bash "${SCRIPT_DIR}/ensure-deps.sh" 2>&1 | tee -a "$LOG_FILE"; then
  log "All dependencies healthy"
else
  log "WARNING: Some dependencies are unhealthy — proceeding anyway"
fi

# Step 2: Wait for Docker (boot race condition)
for i in $(seq 1 10); do
  if docker info &>/dev/null 2>&1; then
    log "Docker is ready"
    break
  fi
  log "Waiting for Docker... ($i/10)"
  sleep 2
done

# Step 3: Ensure Redis container is running
REDIS_CONTAINER=$(docker ps -aq --filter name=futureagi-redis-1 2>/dev/null | head -1)
if [ -n "$REDIS_CONTAINER" ]; then
  STATUS=$(docker inspect --format='{{.State.Status}}' "$REDIS_CONTAINER" 2>/dev/null)
  if [ "$STATUS" != "running" ]; then
    log "Starting Redis container..."
    docker start "$REDIS_CONTAINER" &>/dev/null || true
    sleep 3
  fi
fi

# Step 4: Set Docker restart policies for known containers
for container in futureagi-redis-1; do
  cid=$(docker ps -aq --filter name="$container" 2>/dev/null | head -1)
  if [ -n "$cid" ]; then
    current_policy=$(docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' "$cid" 2>/dev/null)
    if [ "$current_policy" != "always" ]; then
      docker update --restart=always "$cid" &>/dev/null || true
      log "Set restart policy to 'always' for $container"
    fi
  fi
done

# Step 5: PM2 resurrect
log "Resurrecting PM2 processes..."
pm2 resurrect 2>&1 | tee -a "$LOG_FILE" || true

# Step 6: Start optional services from services.conf
if [ -f "$SERVICES_CONF" ]; then
  log "Loading optional services from services.conf..."
  while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    key=$(echo "$key" | tr -d ' ')
    value=$(echo "$value" | tr -d ' ')

    if [ "$value" = "true" ]; then
      # Check if process is already running
      if ! pm2 list 2>/dev/null | grep -q "$key"; then
        log "Starting optional service: $key"
        case "$key" in
          litellm-proxy)
            pm2 start "${PROJECT_DIR}/../litellm/start.sh" --name "$key" --interpreter bash 2>&1 | tee -a "$LOG_FILE" || true
            ;;
          qdrant)
            pm2 start "$(which qdrant 2>/dev/null || echo qdrant)" --name "$key" -- --storage-path ~/.qdrant_storage 2>&1 | tee -a "$LOG_FILE" || true
            ;;
          mcp-sse)
            pm2 start "${PROJECT_DIR}/../mcp-system/bridge/mcp_sse.py" --name "$key" --interpreter python3 2>&1 | tee -a "$LOG_FILE" || true
            ;;
          mcp-gateway-docker)
            pm2 start docker --name "$key" -- compose -f "${PROJECT_DIR}/../mcp-system/docker-compose.yml" up 2>&1 | tee -a "$LOG_FILE" || true
            ;;
          ai-lab-dashboard)
            pm2 start "${PROJECT_DIR}/../ai-lab-dashboard/start.sh" --name "$key" --interpreter bash 2>&1 | tee -a "$LOG_FILE" || true
            ;;
          *)
            log "Unknown service: $key — skipping"
            ;;
        esac
      fi
    fi
  done < "$SERVICES_CONF"
fi

# Step 7: Save PM2 process list (for future resurrection)
pm2 save 2>&1 | tee -a "$LOG_FILE" || true

# Step 8: Verify forge-studio is running
sleep 3
if pm2 list 2>/dev/null | grep -q "forge-studio.*online"; then
  log "forge-studio is online"
else
  log "WARNING: forge-studio is not online — attempting restart..."
  pm2 restart forge-studio 2>&1 | tee -a "$LOG_FILE" || \
    pm2 start "${PROJECT_DIR}/ecosystem.production.cjs" --only forge-studio 2>&1 | tee -a "$LOG_FILE" || true
fi

log "=== Stack startup complete ==="
