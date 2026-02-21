#!/opt/homebrew/bin/bash
set -uo pipefail

# Session pipeline: catch up on unsummarized sessions and extract actionable items.
# Runs on every machine with Claude Code sessions. Idempotent — safe to run multiple times.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_PREFIX="[session-pipeline]"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX WARNING: $*" >&2; }

log "Starting session pipeline"

# 1. Pull learnings repo
log "Step 1: Pulling learnings repo"
(cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || warn "Failed to pull learnings repo"

# 2. Run catch-up (summarize unsummarized sessions on this machine)
log "Step 2: Running catch-up"
"$SCRIPTS_DIR/catch-up.sh" || warn "Catch-up script had errors"

# 3. Run extraction (process unprocessed summaries -> tickets)
log "Step 3: Running extraction"
"$SCRIPTS_DIR/nightly-extract.sh" || warn "Extraction had errors"

# 4. Push learnings repo
log "Step 4: Pushing learnings repo"
max_retries=3
for i in $(seq 1 $max_retries); do
  if (cd "$LEARNINGS_REPO" && git push --quiet 2>/dev/null); then
    log "Push successful"
    break
  fi
  warn "Push attempt $i failed, rebasing and retrying..."
  (cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || true
done

log "Session pipeline complete"
