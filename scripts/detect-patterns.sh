#!/opt/homebrew/bin/bash
set -euo pipefail

# Detects cross-session and cross-project patterns from recent session summaries.
# Uses Claude to identify semantic patterns that resist keyword matching.
# Called from the nightly cron pipeline.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
WINDOW_DAYS="${WINDOW_DAYS:-7}"
LOG_PREFIX="[patterns]"

log() { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX WARNING: $*" >&2; }

PATTERNS_DIR="$LEARNINGS_REPO/patterns"
mkdir -p "$PATTERNS_DIR"

# Collect summaries from the rolling window
cutoff_date="$(date -v-${WINDOW_DAYS}d -u +%Y-%m-%d 2>/dev/null || date -u -d "$WINDOW_DAYS days ago" +%Y-%m-%d)"

recent_summaries=""
summary_count=0
while IFS= read -r f; do
  fdate="$(head -20 "$f" | grep '^date:' | sed 's/^date: *//' | tr -d ' ')" || true
  if [[ -n "$fdate" && "$fdate" > "$cutoff_date" || "$fdate" == "$cutoff_date" ]]; then
    recent_summaries+="$(cat "$f")"
    recent_summaries+=$'\n\n---\n\n'
    summary_count=$((summary_count + 1))
  fi
done < <(find "$LEARNINGS_REPO/sessions" -name '*.md' -type f 2>/dev/null | sort)

if [[ "$summary_count" -eq 0 ]]; then
  log "No summaries in the last $WINDOW_DAYS days."
  exit 0
fi

log "Analyzing $summary_count summaries from the last $WINDOW_DAYS days"

# Collect existing patterns for context
existing_patterns=""
if compgen -G "$PATTERNS_DIR/ptr-*.md" > /dev/null 2>&1; then
  for pf in "$PATTERNS_DIR"/ptr-*.md; do
    existing_patterns+="$(cat "$pf")"
    existing_patterns+=$'\n\n---\n\n'
  done
fi

# Build the detection prompt
DETECT_SCHEMA='{
  "type": "object",
  "properties": {
    "patterns": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string", "description": "Existing pattern ID (ptr-NNN) if updating, or empty string for new" },
          "status": { "type": "string", "enum": ["observation", "pattern"] },
          "description": { "type": "string" },
          "evidence": {
            "type": "array",
            "items": { "type": "string" }
          },
          "suggested_action": { "type": "string" },
          "projects": {
            "type": "array",
            "items": { "type": "string" }
          }
        },
        "required": ["id", "status", "description", "evidence", "suggested_action", "projects"]
      }
    }
  },
  "required": ["patterns"]
}'

DETECT_PROMPT='You are analyzing recent coding session summaries to detect cross-session and cross-project patterns.

Look for:
- Repeated unresolved problems across sessions
- Similar discoveries in different projects
- Recurring workflow friction points
- Common decision patterns (same trade-off appearing repeatedly)

Guidelines for pattern status:
- "observation": First or second occurrence. Watching for more evidence.
- "pattern": 3+ sessions OR 2+ projects show the same signal. Ready to act on.

These thresholds are guidelines, not rules. Use semantic judgment — a problem that appears twice but is clearly systemic can be a pattern. A coincidence that appears 5 times is still just noise.

IMPORTANT: Prefer returning an empty array to reporting weak or speculative patterns. Only surface patterns that would genuinely help if acted on.

If existing patterns are provided below, update them with new evidence rather than creating duplicates. Set their id field to the existing ptr-NNN id.

EXISTING PATTERNS:
'"$existing_patterns"'

Return JSON with your findings.'

# Call Claude for pattern detection
raw_output="$(echo "$recent_summaries" | claude -p \
  --model haiku \
  --no-session-persistence \
  --output-format json \
  --json-schema "$DETECT_SCHEMA" \
  --system-prompt "$DETECT_PROMPT" \
  "Analyze these session summaries for patterns." \
  2>/dev/null)" || {
  warn "Claude pattern detection failed"
  exit 1
}

patterns="$(echo "$raw_output" | jq -c '.structured_output // empty')"
if [[ -z "$patterns" ]]; then
  warn "No structured output from Claude"
  exit 1
fi

pattern_count="$(echo "$patterns" | jq '.patterns | length')"
log "Detected $pattern_count patterns"

if [[ "$pattern_count" -eq 0 ]]; then
  log "No patterns found. Done."
  exit 0
fi

# Find next pattern ID
next_id=1
if compgen -G "$PATTERNS_DIR/ptr-*.md" > /dev/null 2>&1; then
  max_existing="$(ls "$PATTERNS_DIR"/ptr-*.md | sed 's/.*ptr-0*//' | sed 's/\.md//' | sort -n | tail -1)"
  next_id=$((max_existing + 1))
fi

today="$(date -u +%Y-%m-%d)"

# Process each pattern
echo "$patterns" | jq -c '.patterns[]' | while IFS= read -r p; do
  existing_id="$(echo "$p" | jq -r '.id')"
  status="$(echo "$p" | jq -r '.status')"
  description="$(echo "$p" | jq -r '.description')"
  suggested_action="$(echo "$p" | jq -r '.suggested_action')"
  projects="$(echo "$p" | jq -c '.projects')"
  evidence="$(echo "$p" | jq -r '.evidence[]' | sed 's/^/- /')"

  if [[ -n "$existing_id" && -f "$PATTERNS_DIR/$existing_id.md" ]]; then
    # Update existing pattern
    log "Updating existing pattern: $existing_id"
    local_file="$PATTERNS_DIR/$existing_id.md"

    # Update last_seen and increment occurrences
    sed -i '' "s/^last_seen: .*/last_seen: $today/" "$local_file"
    old_occ="$(head -20 "$local_file" | grep '^occurrences:' | sed 's/^occurrences: *//')"
    new_occ=$((old_occ + 1))
    sed -i '' "s/^occurrences: .*/occurrences: $new_occ/" "$local_file"

    # Update status if promoted
    if [[ "$status" == "pattern" ]]; then
      sed -i '' "s/^status: observation/status: pattern/" "$local_file"
    fi

    # Append new evidence
    echo "$evidence" >> "$local_file"
  else
    # Create new pattern
    pattern_id="$(printf 'ptr-%03d' "$next_id")"
    local_file="$PATTERNS_DIR/$pattern_id.md"
    next_id=$((next_id + 1))

    evidence_count="$(echo "$p" | jq '.evidence | length')"

    cat > "$local_file" <<ENDFILE
---
id: $pattern_id
status: $status
first_seen: $today
last_seen: $today
occurrences: $evidence_count
projects: $projects
tickets_created: []
---

### Description
$description

### Evidence
$evidence

### Suggested Action
$suggested_action
ENDFILE

    log "Created new pattern: $pattern_id ($status)"
  fi
done

# Commit pattern changes
(cd "$LEARNINGS_REPO" && git add patterns/ && \
  git diff --cached --quiet || \
  git commit -m "Update patterns: $today" --quiet 2>/dev/null) || \
  warn "Failed to commit pattern changes"

log "Done."
