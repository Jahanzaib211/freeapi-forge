#!/bin/bash
MODE="tree"
NAME=""
SIGNAL="SIGTERM"
while [[ $# -gt 0 ]]; do
  case $1 in
    --mode) MODE="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --signal) SIGNAL="$2"; shift 2 ;;
    *) shift ;;
  esac
done

case "$MODE" in
  tree)
    echo "=== Process Tree ==="
    pstree -p 2>/dev/null || ps auxf 2>/dev/null | head -50
    ;;
  find)
    if [ -z "$NAME" ]; then
      echo "Error: --name required"
      exit 1
    fi
    echo "=== Processes matching: $NAME ==="
    ps aux | grep -i "$NAME" | grep -v grep
    ;;
  kill)
    if [ -z "$NAME" ]; then
      echo "Error: --name required"
      exit 1
    fi
    echo "=== Killing processes matching: $NAME with $SIGNAL ==="
    PIDS=$(ps aux | grep -i "$NAME" | grep -v grep | awk '{print $2}')
    if [ -z "$PIDS" ]; then
      echo "No processes found"
    else
      echo "$PIDS" | xargs kill -"$SIGNAL" 2>/dev/null
      echo "Sent $SIGNAL to: $PIDS"
    fi
    ;;
  *)
    echo "Unknown mode: $MODE"
    ;;
esac
