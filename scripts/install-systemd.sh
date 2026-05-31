#!/bin/bash
# Forge Studio — Install systemd services
# Run: sudo bash scripts/install-systemd.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Installing Forge Studio systemd services..."

# Copy service files
cp "$PROJECT_DIR/scripts/systemd/forge-postgres.service" /etc/systemd/system/
cp "$PROJECT_DIR/scripts/systemd/forge-redis.service" /etc/systemd/system/
cp "$PROJECT_DIR/scripts/systemd/forge-studio.service" /etc/systemd/system/

# Reload and enable
systemctl daemon-reload
systemctl enable forge-postgres forge-redis forge-studio

echo ""
echo "✅ Services installed and enabled:"
echo "   - forge-postgres.service"
echo "   - forge-redis.service"
echo "   - forge-studio.service"
echo ""
echo "Start with: sudo systemctl start forge-postgres forge-redis forge-studio"
echo "Status:     sudo systemctl status forge-studio"
echo "Logs:       sudo journalctl -u forge-studio -f"
