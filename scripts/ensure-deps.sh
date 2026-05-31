#!/usr/bin/env bash
# Forge Studio — Dependency health check
# Ensures all required services are running before forge-studio starts.
# Exit codes: 0 = all healthy, 1 = critical failure

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

MAX_RETRIES=3
RETRY_DELAY=5

log()   { echo -e "${CYAN}[deps]${NC} $*"; }
ok()    { echo -e "${GREEN}  ✓${NC} $*"; }
warn()  { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail()  { echo -e "${RED}  ✗${NC} $*"; }

check_postgres() {
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    if pg_isready -q 2>/dev/null; then
      ok "PostgreSQL is accepting connections"
      return 0
    fi
    retries=$((retries + 1))
    [ $retries -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
  done
  fail "PostgreSQL is not responding"
  return 1
}

check_redis() {
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    if command -v redis-cli &>/dev/null; then
      if redis-cli ping 2>/dev/null | grep -q PONG; then
        ok "Redis is responding (PONG)"
        return 0
      fi
    elif command -v docker &>/dev/null; then
      if docker exec $(docker ps -q --filter ancestor=redis 2>/dev/null | head -1) redis-cli ping 2>/dev/null | grep -q PONG; then
        ok "Redis is responding via Docker (PONG)"
        return 0
      fi
    fi
    retries=$((retries + 1))
    [ $retries -lt $MAX_RETRIES ] && sleep $RETRY_DELAY
  done
  fail "Redis is not responding"
  return 1
}

check_docker() {
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    ok "Docker daemon is running"
    return 0
  fi
  fail "Docker is not available"
  return 1
}

check_redis_container() {
  if ! command -v docker &>/dev/null; then
    warn "Docker not found, skipping container check"
    return 0
  fi

  local container_id
  container_id=$(docker ps -q --filter ancestor=redis 2>/dev/null | head -1)
  if [ -n "$container_id" ]; then
    local status
    status=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null)
    if [ "$status" = "running" ]; then
      ok "Redis Docker container is running"
      return 0
    fi
  fi

  warn "Redis Docker container not running, attempting to start..."
  if docker start futureagi-redis-1 &>/dev/null 2>&1; then
    sleep 2
    ok "Redis Docker container started"
    return 0
  fi

  fail "Could not start Redis container"
  return 1
}

check_node() {
  if command -v node &>/dev/null; then
    local version
    version=$(node --version 2>/dev/null)
    ok "Node.js ${version}"
    return 0
  fi
  fail "Node.js is not installed"
  return 1
}

check_pnpm() {
  if command -v pnpm &>/dev/null; then
    local version
    version=$(pnpm --version 2>/dev/null)
    ok "pnpm ${version}"
    return 0
  fi
  fail "pnpm is not installed"
  return 1
}

main() {
  echo ""
  echo -e "${BOLD}${CYAN}  Forge Studio — Dependency Check${NC}"
  echo -e "  ─────────────────────────────────"
  echo ""

  local failed=0

  log "Checking system dependencies..."
  check_node   || failed=1
  check_pnpm   || failed=1
  check_docker || failed=1

  echo ""
  log "Checking service dependencies..."
  check_redis_container || true
  check_redis  || failed=1
  check_postgres || failed=1

  echo ""
  if [ $failed -eq 0 ]; then
    echo -e "${GREEN}${BOLD}  All dependencies healthy${NC}"
  else
    echo -e "${RED}${BOLD}  Some dependencies are down — services may not start correctly${NC}"
  fi
  echo ""

  return $failed
}

main "$@"
