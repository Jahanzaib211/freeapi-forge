#!/bin/bash

MODE="snapshot"
INTERVAL=5
LIMIT=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --mode)
      MODE="$2"
      shift 2
      ;;
    --interval)
      INTERVAL="$2"
      shift 2
      ;;
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

snapshot() {
  echo "=== System Snapshot ==="
  echo "Hostname: $(hostname)"
  echo "Uptime: $(uptime -p 2>/dev/null || uptime)"
  echo ""
  echo "=== CPU ==="
  mpstat 1 1 2>/dev/null || top -bn1 | head -5
  echo ""
  echo "=== Memory ==="
  free -h
  echo ""
  echo "=== Disk ==="
  df -h / | tail -1
  echo ""
  echo "=== Load Average ==="
  cat /proc/loadavg
}

watch_mode() {
  echo "Watching system (Ctrl+C to stop)..."
  while true; do
    clear
    echo "$(date)"
    snapshot
    sleep "$INTERVAL"
  done
}

top_mode() {
  echo "=== Top ${LIMIT} Processes by CPU ==="
  ps -eo pid,ppid,comm,%cpu,%mem,rss --sort=-%cpu | head -n "$((LIMIT + 1))"
  echo ""
  echo "=== Top ${LIMIT} Processes by Memory ==="
  ps -eo pid,ppid,comm,%cpu,%mem,rss --sort=-%mem | head -n "$((LIMIT + 1))"
}

gpu_mode() {
  if command -v nvidia-smi &> /dev/null; then
    echo "=== GPU Status ==="
    nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader
    echo ""
    echo "=== GPU Processes ==="
    nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv,noheader
  else
    echo "nvidia-smi not found. No NVIDIA GPU detected or drivers not installed."
  fi
}

case "$MODE" in
  snapshot) snapshot ;;
  watch) watch_mode ;;
  top) top_mode ;;
  gpu) gpu_mode ;;
  *) echo "Unknown mode: $MODE. Use: snapshot, watch, top, gpu" ;;
esac
