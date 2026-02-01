#!/bin/bash
set -euo pipefail

CADDY_DIR="$HOME/.local/services/caddy"
LOG_DIR="$HOME/Library/Logs/Manager"
ENV_FILE="$CADDY_DIR/.env"

echo "=== Caddy Setup ==="

# Check for xcaddy (needed for cloudflare plugin)
if ! command -v xcaddy &>/dev/null; then
    echo "xcaddy not found. Install it with: brew install xcaddy"
    exit 1
fi

# Build caddy with cloudflare DNS plugin if not already built
CADDY_BIN="$CADDY_DIR/caddy"
if [ ! -f "$CADDY_BIN" ]; then
    echo "Building Caddy with Cloudflare DNS plugin..."
    xcaddy build --with github.com/caddy-dns/cloudflare --output "$CADDY_BIN"
    echo "Caddy binary built at $CADDY_BIN"
else
    echo "Caddy binary already exists at $CADDY_BIN"
fi

# Create directory structure
mkdir -p "$CADDY_DIR/data" "$CADDY_DIR/config" "$LOG_DIR"

# Collect domain name
if [ -f "$ENV_FILE" ]; then
    # shellcheck source=/dev/null
    source "$ENV_FILE"
fi

if [ -z "${MANAGER_DOMAIN:-}" ]; then
    read -rp "Enter domain name (e.g., manager.example.com): " MANAGER_DOMAIN
fi

# Collect Cloudflare API token
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
    echo ""
    echo "Create a Cloudflare API token with Zone:DNS:Edit permission."
    echo "https://dash.cloudflare.com/profile/api-tokens"
    echo ""
    read -rsp "Enter Cloudflare API token: " CLOUDFLARE_API_TOKEN
    echo ""
fi

# Write env file
cat > "$ENV_FILE" <<EOF
MANAGER_DOMAIN=$MANAGER_DOMAIN
MANAGER_PORT=3100
CLOUDFLARE_API_TOKEN=$CLOUDFLARE_API_TOKEN
CADDY_DATA_DIR=$CADDY_DIR/data
CADDY_LOG_DIR=$LOG_DIR
EOF
chmod 600 "$ENV_FILE"
echo "Credentials saved to $ENV_FILE (mode 600)"

# Generate Caddyfile from template
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE="$SCRIPT_DIR/../caddy/Caddyfile.template"

if [ ! -f "$TEMPLATE" ]; then
    echo "Error: Caddyfile template not found at $TEMPLATE"
    exit 1
fi

# Expand variables in template
export MANAGER_DOMAIN MANAGER_PORT=3100 CLOUDFLARE_API_TOKEN CADDY_DATA_DIR="$CADDY_DIR/data" CADDY_LOG_DIR="$LOG_DIR"
envsubst < "$TEMPLATE" > "$CADDY_DIR/Caddyfile"
echo "Caddyfile written to $CADDY_DIR/Caddyfile"

# Validate
echo "Validating Caddy config..."
"$CADDY_BIN" validate --config "$CADDY_DIR/Caddyfile" --envfile "$ENV_FILE" 2>&1 || {
    echo "Warning: Caddy validation failed. This may be expected if DNS isn't configured yet."
}

echo ""
echo "=== Caddy setup complete ==="
echo ""
echo "Next: Add a DNS A record on Cloudflare:"
echo "  Name: $MANAGER_DOMAIN"
echo "  Type: A"
echo "  Content: <Mac Studio Tailscale IP (100.x.x.x)>"
echo "  Proxy status: DNS only (gray cloud)"
