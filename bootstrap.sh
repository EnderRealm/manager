#!/bin/bash
# Bootstrap script for Manager app
# Creates tmux sessions that the process manager can adopt as orphans

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Session naming convention: mgr-{projectId}-{serviceId}
PROJECT="Manager"
SERVER_SESSION="mgr-${PROJECT}-server"
WEB_SESSION="mgr-${PROJECT}-web"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "Error: tmux is not installed"
    exit 1
fi

# Start server if not already running
if tmux has-session -t "$SERVER_SESSION" 2>/dev/null; then
    echo "Server session already exists: $SERVER_SESSION"
else
    echo "Starting API server in tmux session: $SERVER_SESSION"
    tmux new-session -d -s "$SERVER_SESSION" -c "$SCRIPT_DIR" "bun --watch run src/server/index.ts"
fi

# Wait for server to be ready
echo "Waiting for API server to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "API server is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Warning: API server health check timed out"
    fi
    sleep 1
done

# Start web dev server if not already running
if tmux has-session -t "$WEB_SESSION" 2>/dev/null; then
    echo "Web session already exists: $WEB_SESSION"
else
    echo "Starting Vite dev server in tmux session: $WEB_SESSION"
    tmux new-session -d -s "$WEB_SESSION" -c "$SCRIPT_DIR" "bunx vite"
fi

echo ""
echo "Manager services started!"
echo "  API Server: http://localhost:3000"
echo "  Web UI:     http://localhost:5173"
echo ""
echo "To attach to sessions:"
echo "  tmux attach -t $SERVER_SESSION"
echo "  tmux attach -t $WEB_SESSION"
echo ""
echo "To stop services:"
echo "  tmux kill-session -t $SERVER_SESSION"
echo "  tmux kill-session -t $WEB_SESSION"
