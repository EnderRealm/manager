#!/bin/bash
set -uo pipefail

SERVICE_DIR="$HOME/.local/services/manager"
CADDY_DIR="$HOME/.local/services/caddy"
LOG_DIR="$HOME/Library/Logs/Manager"
LAUNCH_DIR="$HOME/Library/LaunchAgents"
UID_NUM=$(id -u)

log() {
    echo "==> $*"
}

confirm() {
    local prompt="$1"
    read -rp "$prompt [y/N]: " answer
    [[ "$answer" =~ ^[Yy]$ ]]
}

# 1. Unload launchd services
log "Unloading launchd services..."
for label in com.manager.server com.manager.deployer com.manager.caddy; do
    if launchctl bootout "gui/$UID_NUM/$label" 2>/dev/null; then
        echo "  Unloaded $label"
    else
        echo "  $label was not loaded"
    fi
    rm -f "$LAUNCH_DIR/$label.plist"
done
echo "  Plist files removed"

# 2. Optional cleanup
echo ""
if confirm "Remove production checkout ($SERVICE_DIR)?"; then
    rm -rf "$SERVICE_DIR"
    log "Removed $SERVICE_DIR"
fi

if confirm "Remove Caddy config and certs ($CADDY_DIR)?"; then
    rm -rf "$CADDY_DIR"
    log "Removed $CADDY_DIR"
fi

if confirm "Remove logs ($LOG_DIR)?"; then
    rm -rf "$LOG_DIR"
    log "Removed $LOG_DIR"
fi

echo ""
echo "Uninstall complete."
