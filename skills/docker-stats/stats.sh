#!/bin/bash
MODE="status"
CONTAINER=""
LINES=50
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode) MODE="$2"; shift 2 ;;
    --container) CONTAINER="$2"; shift 2 ;;
    --lines) LINES="$2"; shift 2 ;;
    *) shift ;;
  esac
done

case "$MODE" in
  status)
    echo "=== Docker Container Status ==="
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}" 2>/dev/null || echo "Docker not available"
    ;;
  stats)
    echo "=== Docker Resource Usage ==="
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" 2>/dev/null || echo "Docker not available"
    ;;
  logs)
    if [ -z "$CONTAINER" ]; then
      echo "Error: --container required for logs mode"
      exit 1
    fi
    echo "=== Last $LINES lines for $CONTAINER ==="
    docker logs --tail "$LINES" "$CONTAINER" 2>&1 || echo "Container not found"
    ;;
  *)
    echo "Unknown mode: $MODE. Use: status, stats, logs"
    ;;
esac
