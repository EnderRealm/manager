#!/opt/homebrew/bin/bash
set -uo pipefail

# Analysis pipeline: detect patterns and generate rollups from session data.
# Runs on a single always-on machine (Mac Studio). Not idempotent — burns API calls on re-run.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_PREFIX="[analysis-pipeline]"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX WARNING: $*" >&2; }

log "Starting analysis pipeline"

# 1. Pull learnings repo (pick up sessions pushed by other machines)
log "Step 1: Pulling learnings repo"
(cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || warn "Failed to pull learnings repo"

# 2. Run pattern detection (7-day window)
log "Step 2: Running pattern detection"
"$SCRIPTS_DIR/detect-patterns.sh" || warn "Pattern detection had errors"

# 3. Generate rollups
log "Step 3: Generating rollups"
"$SCRIPTS_DIR/generate-rollups.sh" || warn "Rollup generation had errors"

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

log "Analysis pipeline complete"
