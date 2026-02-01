#!/bin/bash
set -euo pipefail

REPO_URL="git@github.com:EnderRealm/manager.git"
SERVICE_DIR="$HOME/.local/services/manager"
CADDY_DIR="$HOME/.local/services/caddy"
LOG_DIR="$HOME/Library/Logs/Manager"
BUN="/opt/homebrew/bin/bun"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
    echo "==> $*"
}

# 1. Check prerequisites
log "Checking prerequisites..."

missing=()
command -v bun &>/dev/null || missing+=("bun")
command -v git &>/dev/null || missing+=("git")
command -v xcaddy &>/dev/null || missing+=("xcaddy (brew install xcaddy)")
command -v tailscale &>/dev/null || missing+=("tailscale")

if [ ${#missing[@]} -gt 0 ]; then
    echo "Missing required tools:"
    for m in "${missing[@]}"; do
        echo "  - $m"
    done
    exit 1
fi

# 2. Create directory structure
log "Creating directory structure..."
mkdir -p "$SERVICE_DIR" "$CADDY_DIR/data" "$CADDY_DIR/config" "$LOG_DIR"

# 3. Clone or update repo
if [ -d "$SERVICE_DIR/.git" ]; then
    log "Updating existing checkout..."
    cd "$SERVICE_DIR"
    git fetch origin main --quiet
    git reset --hard origin/main --quiet
else
    log "Cloning repository..."
    git clone "$REPO_URL" "$SERVICE_DIR"
    cd "$SERVICE_DIR"
fi

# 4. Install dependencies and build
log "Installing dependencies..."
"$BUN" install --frozen-lockfile

log "Building frontend..."
"$BUN" x vite build

# 5. Config file
if [ ! -f "$SERVICE_DIR/config.json" ]; then
    # Check if dev config exists to copy from
    DEV_CONFIG="$SCRIPT_DIR/../config.json"
    if [ -f "$DEV_CONFIG" ]; then
        log "Copying config.json from dev checkout..."
        cp "$DEV_CONFIG" "$SERVICE_DIR/config.json"
    else
        log "Creating empty config.json..."
        echo '{"projects":[]}' > "$SERVICE_DIR/config.json"
    fi
else
    log "config.json already exists"
fi

# 6. Caddy setup
if [ ! -f "$CADDY_DIR/Caddyfile" ]; then
    log "Running Caddy setup..."
    "$SERVICE_DIR/scripts/setup-caddy.sh"
else
    log "Caddy already configured"
fi

# 7. Generate and install plists
log "Installing launchd services..."
"$SERVICE_DIR/scripts/generate-plists.sh" --install

# 8. Summary
echo ""
echo "========================================="
echo "  Manager production setup complete"
echo "========================================="
echo ""
echo "Services:"
launchctl list 2>/dev/null | grep com.manager || echo "  (check with: launchctl list | grep com.manager)"
echo ""
echo "Logs:"
echo "  tail -f $LOG_DIR/server.log"
echo "  tail -f $LOG_DIR/deployer.log"
echo "  tail -f $LOG_DIR/caddy.log"
echo ""

# Check Tailscale status
TS_IP=$(tailscale ip -4 2>/dev/null || echo "")
if [ -n "$TS_IP" ]; then
    echo "Tailscale IP: $TS_IP"
    echo ""
    echo "Manual step: Add DNS A record on Cloudflare"
    echo "  Name: <your-domain>"
    echo "  Type: A"
    echo "  Content: $TS_IP"
    echo "  Proxy status: DNS only (gray cloud)"
else
    echo "Warning: Could not detect Tailscale IP."
    echo "Ensure Tailscale is running: tailscale up"
fi
