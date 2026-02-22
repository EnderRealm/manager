#!/bin/bash
set -euo pipefail

SERVICE_DIR="$HOME/.local/services/manager"
BUN="/opt/homebrew/bin/bun"

log() {
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

cd "$SERVICE_DIR"

log "Checking for updates..."

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "No changes (at ${LOCAL:0:7})"
    exit 0
fi

log "Deploying ${LOCAL:0:7}..${REMOTE:0:7}"

git reset --hard origin/main --quiet

# Check if lockfile changed
CHANGED_FILES=$(git diff --name-only "$LOCAL..$REMOTE" 2>/dev/null || echo "")
if echo "$CHANGED_FILES" | grep -q "bun.lock"; then
    log "bun.lock changed, installing dependencies..."
    "$BUN" install --frozen-lockfile
fi

log "Building frontend..."
"$BUN" x vite build

log "Restarting server..."
UID_NUM=$(id -u)
launchctl kickstart -k "gui/$UID_NUM/com.manager.server"

log "Deploy complete (now at ${REMOTE:0:7})"

osascript -e "display notification \"Deployed ${REMOTE:0:7}\" with title \"Manager\" sound name \"Glass\"" 2>/dev/null || true

exit 0
