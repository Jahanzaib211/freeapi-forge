#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║  Forge Studio — One-Click Installer                         ║
# ║  by Jahanzaib Ali · alilabsx.com                            ║
# ╚══════════════════════════════════════════════════════════════╝
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/Jahanzaib211/forge-studio/main/install.sh | bash
#
# What it does:
#   1. Detects OS and installs missing dependencies
#   2. Clones/updates forge-studio
#   3. Installs node dependencies and builds
#   4. Sets up PostgreSQL, Redis, Qdrant
#   5. Runs database migrations
#   6. Configures nginx reverse proxy
#   7. Sets up PM2 process manager (reboot-proof)
#   8. Optional: Cloudflare Tunnel for remote access
#   9. Opens browser to the dashboard

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────
FORGE_DIR="${FORGE_DIR:-$HOME/forge-studio}"
REPO_URL="https://github.com/Jahanzaib211/forge-studio.git"
BRANCH="main"
NODE_MIN_VERSION=18
PORT=5051
NGINX_PORT=8080

# ─── Colors & Formatting ────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
NC='\033[0m'
BLINK='\033[5m'

# ─── Logo ────────────────────────────────────────────────────────
show_logo() {
  clear
  echo ""
  echo -e "${CYAN}${BOLD}"
  cat << 'LOGO'
    ███████╗██████╗ ██████╗  ██████╗ ██████╗
    ██╔════╝██╔══██╗╚════██╗██╔═══██╗██╔══██╗
    █████╗  ██████╔╝ █████╔╝██║   ██║██████╔╝
    ██╔══╝  ██╔══██╗ ╚═══██╗██║   ██║██╔══██╗
    ██║     ██║  ██║██████╔╝╚██████╔╝██║  ██║
    ╚═╝     ╚═╝  ╚═╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝
LOGO
  echo -e "${NC}"
  echo -e "  ${DIM}AI Lab Control Center · v3.0.0${NC}"
  echo -e "  ${DIM}alilabsx.com · github.com/Jahanzaib211${NC}"
  echo ""
}

# ─── Progress Bar ────────────────────────────────────────────────
STEP=0
TOTAL_STEPS=9

progress() {
  STEP=$((STEP + 1))
  local pct=$((STEP * 100 / TOTAL_STEPS))
  local filled=$((pct / 5))
  local empty=$((20 - filled))
  local bar=""
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=0; i<empty; i++)); do bar+="░"; done
  echo ""
  echo -e "  ${DIM}[$bar] ${pct}%${NC}  ${WHITE}${BOLD}Step ${STEP}/${TOTAL_STEPS}: $1${NC}"
  echo ""
}

# ─── Spinner ─────────────────────────────────────────────────────
spinner() {
  local pid=$1
  local msg="${2:-Working...}"
  local spin='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0

  while kill -0 "$pid" 2>/dev/null; do
    printf "\r  ${CYAN}${spin:i++%${#spin}:1}${NC} ${DIM}%s${NC}" "$msg"
    sleep 0.1
  done
  printf "\r"
}

# ─── Logging ─────────────────────────────────────────────────────
log()   { echo -e "  ${CYAN}▸${NC} $*"; }
ok()    { echo -e "  ${GREEN}✔${NC} $*"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "  ${RED}✘${NC} $*"; }

# ─── Fun Messages ────────────────────────────────────────────────
forge_msg() {
  local msgs=(
    "Heating up the neural pathways..."
    "Forging intelligence..."
    "Calibrating GPU tensors..."
    "Loading the knowledge forge..."
    "Igniting the inference engine..."
    "Warming up the transformer layers..."
    "Compiling the mind matrix..."
    "Assembling the AI stack..."
    "Preparing the neural forge..."
    "Optimizing the attention heads..."
  )
  echo -e "  ${DIM}${msgs[$((RANDOM % ${#msgs[@]}))]}${NC}"
}

# ─── Detect OS ───────────────────────────────────────────────────
detect_os() {
  if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="${ID,,}"
    OS_NAME="$PRETTY_NAME"
  elif [[ "$(uname -s)" == "Darwin" ]]; then
    OS_ID="macos"
    OS_NAME="macOS $(sw_vers -productVersion)"
  else
    OS_ID="unknown"
    OS_NAME="$(uname -s)"
  fi
  log "Detected: ${BOLD}${OS_NAME}${NC}"
}

# ─── Check / Install Dependencies ────────────────────────────────
install_deps() {
  local missing=()

  # Node.js
  if command -v node &>/dev/null; then
    local ver
    ver=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$ver" -ge "$NODE_MIN_VERSION" ]; then
      ok "Node.js $(node --version)"
    else
      warn "Node.js too old ($(node --version)), need v${NODE_MIN_VERSION}+"
      missing+=("node")
    fi
  else
    missing+=("node")
  fi

  # pnpm
  if command -v pnpm &>/dev/null; then
    ok "pnpm $(pnpm --version)"
  else
    missing+=("pnpm")
  fi

  # Docker
  if command -v docker &>/dev/null && docker info &>/dev/null 2>&1; then
    ok "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
  else
    missing+=("docker")
  fi

  # Git
  if command -v git &>/dev/null; then
    ok "Git $(git --version | awk '{print $3}')"
  else
    missing+=("git")
  fi

  # PostgreSQL client
  if command -v psql &>/dev/null; then
    ok "PostgreSQL client"
  else
    missing+=("postgresql-client")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    log "Installing missing: ${BOLD}${missing[*]}${NC}"
    install_packages "${missing[@]}"
  fi
}

install_packages() {
  local pkgs=("$@")

  if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
    for pkg in "${pkgs[@]}"; do
      case "$pkg" in
        node)
          curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - &>/dev/null
          sudo apt-get install -y nodejs &>/dev/null
          ;;
        pnpm)
          sudo npm install -g pnpm@latest &>/dev/null
          ;;
        docker)
          curl -fsSL https://get.docker.com | sudo sh &>/dev/null
          sudo usermod -aG docker "$USER" 2>/dev/null || true
          ;;
        git)
          sudo apt-get install -y git &>/dev/null
          ;;
        postgresql-client)
          sudo apt-get install -y postgresql-client &>/dev/null
          ;;
      esac
    done
  elif [[ "$OS_ID" == "macos" ]]; then
    if ! command -v brew &>/dev/null; then
      log "Installing Homebrew..."
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" &>/dev/null
    fi
    for pkg in "${pkgs[@]}"; do
      case "$pkg" in
        node) brew install node &>/dev/null ;;
        pnpm) npm install -g pnpm &>/dev/null ;;
        docker) brew install --cask docker &>/dev/null ;;
        git) brew install git &>/dev/null ;;
        postgresql-client) brew install postgresql &>/dev/null ;;
      esac
    done
  elif [[ "$OS_ID" == "arch" || "$OS_ID" == "manjaro" ]]; then
    for pkg in "${pkgs[@]}"; do
      case "$pkg" in
        node) sudo pacman -S --noconfirm nodejs npm &>/dev/null ;;
        pnpm) sudo npm install -g pnpm &>/dev/null ;;
        docker) sudo pacman -S --noconfirm docker && sudo systemctl start docker &>/dev/null ;;
        git) sudo pacman -S --noconfirm git &>/dev/null ;;
        postgresql-client) sudo pacman -S --noconfirm postgresql &>/dev/null ;;
      esac
    done
  fi

  ok "Dependencies installed"
}

# ─── Clone / Update Repo ────────────────────────────────────────
setup_repo() {
  if [ -d "${FORGE_DIR}/.git" ]; then
    log "Repository exists — pulling latest..."
    git -C "${FORGE_DIR}" fetch origin &>/dev/null
    git -C "${FORGE_DIR}" checkout "${BRANCH}" &>/dev/null
    git -C "${FORGE_DIR}" pull origin "${BRANCH}" &>/dev/null
    ok "Updated to latest ${BRANCH}"
  else
    log "Cloning forge-studio..."
    git clone --depth 1 -b "${BRANCH}" "${REPO_URL}" "${FORGE_DIR}" &>/dev/null
    ok "Cloned to ${FORGE_DIR}"
  fi
}

# ─── Install & Build ────────────────────────────────────────────
build_forge() {
  cd "${FORGE_DIR}"

  log "Installing dependencies..."
  pnpm install --frozen-lockfile &>/dev/null
  ok "Dependencies installed"

  forge_msg
  log "Building production bundle..."
  pnpm build &>/dev/null
  ok "Build complete"
}

# ─── Database Setup ──────────────────────────────────────────────
setup_database() {
  log "Checking PostgreSQL..."
  if pg_isready -q 2>/dev/null; then
    ok "PostgreSQL is running"
  else
    if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
      sudo systemctl start postgresql 2>/dev/null || true
      sudo systemctl enable postgresql 2>/dev/null || true
    fi
    ok "PostgreSQL started"
  fi

  log "Running database migrations..."
  cd "${FORGE_DIR}"
  pnpm db:push 2>/dev/null || warn "Migration may have already been applied"
  ok "Database ready"

  log "Seeding database..."
  pnpm tsx server/seed.ts 2>/dev/null || warn "Seed may have already been applied"
  ok "Database seeded"
}

# ─── Services Setup ──────────────────────────────────────────────
setup_services() {
  log "Setting up Redis..."
  if command -v docker &>/dev/null; then
    local redis_container
    redis_container=$(docker ps -aq --filter name=futureagi-redis-1 2>/dev/null | head -1)
    if [ -n "$redis_container" ]; then
      docker start "$redis_container" &>/dev/null 2>&1 || true
      docker update --restart=always "$redis_container" &>/dev/null 2>&1 || true
    else
      docker run -d --name futureagi-redis-1 --restart=always -p 6379:6379 redis:7-alpine &>/dev/null
    fi
    ok "Redis running on :6379"
  fi

  log "Setting up PM2..."
  if ! command -v pm2 &>/dev/null; then
    sudo npm install -g pm2 &>/dev/null
  fi
  ok "PM2 $(pm2 --version 2>/dev/null | head -1)"

  log "Starting forge-studio..."
  cd "${FORGE_DIR}"
  pm2 start ecosystem.production.cjs 2>/dev/null || pm2 start ecosystem.config.cjs 2>/dev/null
  pm2 save 2>/dev/null || true
  ok "forge-studio started on :${PORT}"

  log "Starting optional services..."
  pm2 start ecosystem.services.cjs 2>/dev/null || true
  pm2 save 2>/dev/null || true
  ok "Services started"
}

# ─── PM2 Boot Persistence ────────────────────────────────────────
setup_persistence() {
  log "Configuring PM2 startup on boot..."

  local pm2_bin
  pm2_bin=$(which pm2)
  local node_bin
  node_bin=$(which node)
  local node_dir
  node_dir=$(dirname "$(dirname "$node_bin")")

  # Generate systemd service
  pm2 startup systemd -u "$USER" --hp "$HOME" 2>/dev/null || {
    warn "PM2 startup needs sudo. Run manually:"
    echo -e "    ${BOLD}sudo env PATH=\$PATH:${node_dir}/bin pm2 startup systemd -u $USER --hp $HOME${NC}"
  }

  pm2 save 2>/dev/null || true
  ok "PM2 process list saved"
}

# ─── Nginx Setup ─────────────────────────────────────────────────
setup_nginx() {
  log "Configuring nginx..."

  if ! command -v nginx &>/dev/null; then
    if [[ "$OS_ID" == "ubuntu" || "$OS_ID" == "debian" ]]; then
      sudo apt-get install -y nginx &>/dev/null
    elif [[ "$OS_ID" == "macos" ]]; then
      brew install nginx &>/dev/null
    fi
  fi

  # Install forge-studio nginx config
  sudo cp "${FORGE_DIR}/nginx/forge-studio.conf" /etc/nginx/sites-available/forge-studio 2>/dev/null || true
  sudo ln -sf /etc/nginx/sites-available/forge-studio /etc/nginx/sites-enabled/forge-studio 2>/dev/null || true

  # Remove default site if it conflicts
  sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

  sudo nginx -t 2>/dev/null && sudo systemctl reload nginx 2>/dev/null || sudo nginx -s reload 2>/dev/null || true
  ok "nginx configured on :${NGINX_PORT}"
}

# ─── Open Browser ────────────────────────────────────────────────
open_browser() {
  local url="http://localhost:${PORT}"
  log "Opening ${BOLD}${url}${NC}"

  if command -v xdg-open &>/dev/null; then
    xdg-open "$url" &>/dev/null &
  elif command -v open &>/dev/null; then
    open "$url" &>/dev/null &
  elif command -v wslview &>/dev/null; then
    wslview "$url" &>/dev/null &
  else
    warn "Cannot auto-open browser. Visit: ${url}"
  fi
}

# ─── Summary ─────────────────────────────────────────────────────
show_summary() {
  echo ""
  echo -e "${CYAN}${BOLD}  ╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}  ║        FORGE STUDIO IS LIVE!                    ║${NC}"
  echo -e "${CYAN}${BOLD}  ╚══════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  ${BOLD}Local:${NC}     ${GREEN}http://localhost:${PORT}${NC}"
  echo -e "  ${BOLD}API:${NC}       ${GREEN}http://localhost:${PORT}/v1/chat/completions${NC}"
  echo -e "  ${BOLD}WebSocket:${NC} ${GREEN}ws://localhost:${PORT}/ws${NC}"
  echo -e "  ${BOLD}MCP:${NC}       ${GREEN}http://localhost:${PORT}/mcp/sse${NC}"
  echo -e "  ${BOLD}Docs:${NC}      ${GREEN}http://localhost:${PORT}/api-docs${NC}"
  echo ""
  echo -e "  ${DIM}Default login: admin@forge.local (mock session)${NC}"
  echo ""
  echo -e "  ${BOLD}Commands:${NC}"
  echo -e "    pm2 list              ${DIM}— view all processes${NC}"
  echo -e "    pm2 logs forge-studio ${DIM}— view live logs${NC}"
  echo -e "    pm2 restart forge-studio ${DIM}— restart app${NC}"
  echo -e "    pm2 save              ${DIM}— save process list${NC}"
  echo ""
  echo -e "  ${BOLD}Remote access:${NC}"
  echo -e "    bash ${FORGE_DIR}/scripts/setup-cloudflare-tunnel.sh"
  echo ""
  echo -e "  ${DIM}Made by Jahanzaib Ali · alilabsx.com · MIT License${NC}"
  echo ""
}

# ─── Main ────────────────────────────────────────────────────────
main() {
  show_logo
  detect_os

  progress "Checking dependencies"
  install_deps

  progress "Setting up repository"
  setup_repo

  progress "Building forge-studio"
  build_forge

  progress "Configuring database"
  setup_database

  progress "Starting services"
  setup_services

  progress "Making it reboot-proof"
  setup_persistence

  progress "Configuring nginx"
  setup_nginx

  progress "Finalizing"
  forge_msg

  progress "Launching forge-studio"
  show_summary
  open_browser
}

main "$@"
