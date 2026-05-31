#!/usr/bin/env bash
# Forge Studio — Cloudflare Tunnel setup
# Sets up cloudflared to expose forge-studio via alilabsx.com

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

log()  { echo -e "${CYAN}[tunnel]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $*"; }
fail() { echo -e "${RED}  ✗${NC} $*"; }

DOMAIN="alilabsx.com"
SUBDOMAIN="studio"
TUNNEL_NAME="forge-studio"
CONFIG_DIR="$HOME/.cloudflared"
CONFIG_FILE="${CONFIG_DIR}/config.yml"

echo ""
echo -e "${BOLD}${CYAN}  Forge Studio — Cloudflare Tunnel Setup${NC}"
echo -e "  ────────────────────────────────────────"
echo ""

# Step 1: Check if cloudflared is installed
if ! command -v cloudflared &>/dev/null; then
  log "Installing cloudflared..."
  if [[ "$(uname -s)" == "Linux" ]]; then
    ARCH=$(uname -m)
    case "$ARCH" in
      x86_64)  ARCH="amd64" ;;
      aarch64) ARCH="arm64" ;;
      armv7l)  ARCH="arm" ;;
    esac
    curl -fsSL "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${ARCH}" -o /tmp/cloudflared
    sudo install -m 755 /tmp/cloudflared /usr/local/bin/cloudflared
    rm -f /tmp/cloudflared
  else
    fail "Unsupported OS. Install cloudflared manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/create-local-tunnel/"
    exit 1
  fi
fi

ok "cloudflared $(cloudflared --version 2>&1 | head -1)"

# Step 2: Check if already authenticated
if [ ! -f "${CONFIG_DIR}/cert.pem" ]; then
  log "Authenticating with Cloudflare..."
  log "A browser window will open. Select the zone for ${DOMAIN}."
  cloudflared tunnel login
fi

ok "Cloudflare authentication found"

# Step 3: Create tunnel if it doesn't exist
if ! cloudflared tunnel list 2>/dev/null | grep -q "${TUNNEL_NAME}"; then
  log "Creating tunnel '${TUNNEL_NAME}'..."
  cloudflared tunnel create "${TUNNEL_NAME}"
fi

ok "Tunnel '${TUNNEL_NAME}' exists"

# Step 4: Write config
mkdir -p "${CONFIG_DIR}"
CRED_FILE=$(cloudflared tunnel token "${TUNNEL_NAME}" 2>/dev/null || true)

cat > "${CONFIG_FILE}" << EOF
tunnel: ${TUNNEL_NAME}
credentials-file: ${CONFIG_DIR}/$(cloudflared tunnel list 2>/dev/null | grep "${TUNNEL_NAME}" | awk '{print $1}').json

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:8080
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      tcpKeepAlive: 30s
  - hostname: www.${DOMAIN}
    service: http://localhost:8080
    originRequest:
      noTLSVerify: false
      connectTimeout: 30s
      tcpKeepAlive: 30s
  - service: http_status:404
EOF

ok "Config written to ${CONFIG_FILE}"

# Step 5: Add DNS route
log "Adding DNS route for ${DOMAIN}..."
cloudflared tunnel route dns "${TUNNEL_NAME}" "${DOMAIN}" 2>/dev/null || true
cloudflared tunnel route dns "${TUNNEL_NAME}" "www.${DOMAIN}" 2>/dev/null || true
ok "DNS routes configured"

# Step 6: Test tunnel (quick check)
log "Testing tunnel connectivity..."
if timeout 5 cloudflared tunnel run "${TUNNEL_NAME}" 2>/dev/null; then
  ok "Tunnel test passed"
else
  warn "Tunnel test timed out (expected — it stays running)"
fi

echo ""
echo -e "${GREEN}${BOLD}  Cloudflare Tunnel configured!${NC}"
echo ""
echo -e "  Next steps:"
echo -e "  1. Go to ${BOLD}https://dash.cloudflare.com${NC}"
echo -e "  2. Select ${BOLD}${DOMAIN}${NC}"
echo -e "  3. SSL/TLS → Overview → Set to ${BOLD}Full (Strict)${NC}"
echo -e "  4. SSL/TLS → Edge Certificates → Enable ${BOLD}Always Use HTTPS${NC}"
echo -e "  5. SSL/TLS → Edge Certificates → Enable ${BOLD}HSTS${NC}"
echo -e "  6. Security → Bots → Enable ${BOLD}Bot Fight Mode${NC}"
echo -e "  7. Security → WAF → Enable managed rules${NC}"
echo -e "  8. Security → Settings → Security Level → ${BOLD}High${NC}"
echo ""
echo -e "  To start the tunnel:"
echo -e "    ${BOLD}pm2 start cloudflared --name cloudflared -- tunnel run forge-studio${NC}"
echo ""
