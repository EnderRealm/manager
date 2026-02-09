#!/opt/homebrew/bin/bash
set -uo pipefail

# Nightly pipeline: orchestrates the full learnings extraction cycle.
# Designed to run via launchd on Mac Studio. Partial failure is ok — next run picks up.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
SCRIPTS_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_PREFIX="[nightly-pipeline]"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"; }
warn() { echo "$(date '+%Y-%m-%d %H:%M:%S') $LOG_PREFIX WARNING: $*" >&2; }

log "Starting nightly pipeline"

# 1. Pull learnings repo
log "Step 1: Pulling learnings repo"
(cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || warn "Failed to pull learnings repo"

# 2. Run catch-up script (summarize missed sessions on this machine)
log "Step 2: Running catch-up"
"$SCRIPTS_DIR/catch-up.sh" || warn "Catch-up script had errors"

# 3. Run nightly extraction (process unprocessed summaries -> tickets)
log "Step 3: Running nightly extraction"
"$SCRIPTS_DIR/nightly-extract.sh" || warn "Nightly extraction had errors"

# 4. Run pattern detection (7-day window)
log "Step 4: Running pattern detection"
"$SCRIPTS_DIR/detect-patterns.sh" || warn "Pattern detection had errors"

# 5. Regenerate rollups
log "Step 5: Generating rollups"
"$SCRIPTS_DIR/generate-rollups.sh" || warn "Rollup generation had errors"

# 6. Push learnings repo (rebase + retry x3)
log "Step 6: Pushing learnings repo"
max_retries=3
for i in $(seq 1 $max_retries); do
  if (cd "$LEARNINGS_REPO" && git push --quiet 2>/dev/null); then
    log "Push successful"
    break
  fi
  warn "Push attempt $i failed, rebasing and retrying..."
  (cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || true
done

log "Nightly pipeline complete"
