#!/opt/homebrew/bin/bash
set -euo pipefail

# Generates rollup summaries at daily, weekly, monthly, and annual levels.
# Each level aggregates from its inputs until the period ends, then becomes immutable.
# Called from the nightly cron pipeline.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
LOG_PREFIX="[rollups]"

log() { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX WARNING: $*" >&2; }

if [[ ! -d "$LEARNINGS_REPO/sessions" ]]; then
  log "No sessions directory in $LEARNINGS_REPO, nothing to do."
  exit 0
fi

ROLLUP_PROMPT='You are generating a rollup summary from coding session data.

Synthesize the inputs into a cohesive narrative organized into two major sections: Looking Back and Looking Forward. Do not simply concatenate — identify themes, quantify where possible, and surface actionable insights.

## Looking Back

### Stats
Aggregate quantitative data from the inputs. Include where available:
- Sessions count
- Messages (sum message_count from frontmatter if present)
- Files touched (sum files_touched from frontmatter if present)
- Tickets worked on (unique ticket IDs referenced)
- Tickets closed (if determinable from context)
Present as a compact list. Omit any metric you cannot determine.

### Big Wins
Bullet list of specific accomplishments worth highlighting. Focus on completed features, shipped work, resolved hard problems, and milestones reached. Be specific — name the feature/system, not just "made progress."

### Key Learnings
Bullet list combining:
- Important decisions made (preserve (auto)/(human) tags)
- Discoveries about codebases, tools, or domain
- Patterns identified (reference pattern IDs if known)

## Looking Forward

### Suggested Changes
Bullet list of improvements identified during this period — things that should change in workflows, CLAUDE.md, tooling, or conventions. Include friction categories and counts if available (e.g., "3 sessions hit buggy_code issues with drag-and-drop").

### Outstanding Work
Bullet list of incomplete items carried forward. Include enough context to pick up the work.

### Proposed Changes
Bullet list of potential improvements that emerged from patterns or discoveries but have not been actioned yet. Include rationale.

### Open Areas of Work
For each active project, list major themes or epics in progress. One line per project with its key focus areas.

Keep it concise. Omit sections that would be empty.'

# Generate a rollup for a given level, date, and input files.
# Args: level, date_label, input_files...
generate_rollup() {
  local level="$1"
  local date_label="$2"
  shift 2
  local input_files=("$@")

  local output_dir="$LEARNINGS_REPO/rollups/$level"
  local output_file="$output_dir/$date_label.md"
  mkdir -p "$output_dir"

  # Collect input content and aggregate metrics
  local combined=""
  local projects=()
  local session_count=0
  local total_messages=0
  local total_tool_uses=0
  local total_files_touched=0
  for f in "${input_files[@]}"; do
    [[ -f "$f" ]] || continue
    combined+="$(cat "$f")"
    combined+=$'\n\n---\n\n'

    # Extract project names from frontmatter
    local proj
    proj="$(head -20 "$f" | grep '^project:' | sed 's/^project: *//' | tr -d ' ')" || true
    if [[ -n "$proj" ]]; then
      projects+=("$proj")
    fi
    # Extract projects list from rollup frontmatter
    local projs_line
    projs_line="$(head -20 "$f" | grep '^projects:' | sed 's/^projects: *//')" || true
    if [[ -n "$projs_line" ]]; then
      for p in $(echo "$projs_line" | tr -d '[]' | tr ',' '\n' | tr -d ' '); do
        projects+=("$p")
      done
    fi

    # Aggregate quantitative metrics from frontmatter
    local mc tc fc
    mc="$(head -20 "$f" | grep '^message_count:' | sed 's/^message_count: *//' | tr -d ' ')" || true
    tc="$(head -20 "$f" | grep '^tool_uses:' | sed 's/^tool_uses: *//' | tr -d ' ')" || true
    fc="$(head -20 "$f" | grep '^files_touched:' | sed 's/^files_touched: *//' | tr -d ' ')" || true
    [[ -n "$mc" && "$mc" =~ ^[0-9]+$ ]] && total_messages=$((total_messages + mc))
    [[ -n "$tc" && "$tc" =~ ^[0-9]+$ ]] && total_tool_uses=$((total_tool_uses + tc))
    [[ -n "$fc" && "$fc" =~ ^[0-9]+$ ]] && total_files_touched=$((total_files_touched + fc))

    session_count=$((session_count + 1))
  done

  if [[ -z "$combined" ]]; then
    return
  fi

  # Deduplicate projects
  local unique_projects
  unique_projects="$(printf '%s\n' "${projects[@]}" | sort -u | jq -R . | jq -sc .)"

  # Find active patterns
  local active_patterns="[]"
  if [[ -d "$LEARNINGS_REPO/patterns" ]]; then
    active_patterns="$(find "$LEARNINGS_REPO/patterns" -name '*.md' -type f -exec head -20 {} \; 2>/dev/null | \
      grep '^id:' | sed 's/^id: *//' | tr -d ' ' | jq -R . | jq -sc .)" || active_patterns="[]"
  fi

  log "Generating $level rollup: $date_label ($session_count inputs, projects: $unique_projects)"

  # Build metrics context for Claude
  local metrics_context=""
  metrics_context="Aggregated metrics for this period: sessions=$session_count"
  [[ $total_messages -gt 0 ]] && metrics_context+=", messages=$total_messages"
  [[ $total_tool_uses -gt 0 ]] && metrics_context+=", tool_uses=$total_tool_uses"
  [[ $total_files_touched -gt 0 ]] && metrics_context+=", files_touched=$total_files_touched"

  # Call Claude to generate rollup
  local body
  body="$(echo "$combined" | claude -p \
    --model haiku \
    --no-session-persistence \
    --system-prompt "$ROLLUP_PROMPT" \
    "Generate a $level rollup for $date_label from these inputs. $metrics_context" \
    2>/dev/null)" || {
    warn "Claude failed for $level rollup $date_label"
    return
  }

  # Write rollup file
  cat > "$output_file" <<ENDFILE
---
level: $level
date: $date_label
projects: $unique_projects
sessions: $session_count
message_count: $total_messages
tool_uses: $total_tool_uses
files_touched: $total_files_touched
patterns_active: $active_patterns
---

$body
ENDFILE

  log "Wrote $level rollup: $date_label"
}

# --- Daily rollup: from session summaries for a given date ---

generate_daily() {
  local target_date="$1"
  local output_file="$LEARNINGS_REPO/rollups/daily/$target_date.md"

  # Find session summaries for this date
  local inputs=()
  while IFS= read -r f; do
    # Check date in frontmatter
    local fdate
    fdate="$(head -20 "$f" | grep '^date:' | sed 's/^date: *//' | tr -d ' ')" || true
    if [[ "$fdate" == "$target_date" ]]; then
      inputs+=("$f")
    fi
  done < <(find "$LEARNINGS_REPO/sessions" -name '*.md' -type f 2>/dev/null)

  if [[ ${#inputs[@]} -eq 0 ]]; then
    return
  fi

  generate_rollup "daily" "$target_date" "${inputs[@]}"
}

# --- Weekly rollup: from daily rollups for a given ISO week ---

generate_weekly() {
  local year="$1"
  local week="$2"
  local label="${year}-W$(printf '%02d' "$week")"
  local output_file="$LEARNINGS_REPO/rollups/weekly/$label.md"

  # Find daily rollups for this week
  local inputs=()
  for daily_file in "$LEARNINGS_REPO/rollups/daily"/*.md; do
    [[ -f "$daily_file" ]] || continue
    local daily_date
    daily_date="$(basename "$daily_file" .md)"
    # Check if this date falls in the target week
    local file_week
    file_week="$(date -jf '%Y-%m-%d' "$daily_date" '+%G-W%V' 2>/dev/null)" || continue
    if [[ "$file_week" == "$label" ]]; then
      inputs+=("$daily_file")
    fi
  done

  if [[ ${#inputs[@]} -eq 0 ]]; then
    return
  fi

  generate_rollup "weekly" "$label" "${inputs[@]}"
}

# --- Monthly rollup: from weekly rollups for a given month ---

generate_monthly() {
  local year_month="$1"  # YYYY-MM

  local inputs=()
  for weekly_file in "$LEARNINGS_REPO/rollups/weekly"/*.md; do
    [[ -f "$weekly_file" ]] || continue
    # Parse the weekly label (YYYY-WNN) and check if it falls in this month
    local wlabel
    wlabel="$(basename "$weekly_file" .md)"
    local wyear="${wlabel%-W*}"
    local wnum="${wlabel#*-W}"
    # Get the Monday of this ISO week and check its month
    local monday
    monday="$(python3 -c "from datetime import datetime, timedelta; d=datetime.strptime('${wyear}-W${wnum}-1','%G-W%V-%u'); print(d.strftime('%Y-%m'))" 2>/dev/null)" || continue
    if [[ "$monday" == "$year_month" ]]; then
      inputs+=("$weekly_file")
    fi
  done

  if [[ ${#inputs[@]} -eq 0 ]]; then
    return
  fi

  generate_rollup "monthly" "$year_month" "${inputs[@]}"
}

# --- Annual rollup: from monthly rollups for a given year ---

generate_annual() {
  local year="$1"

  local inputs=()
  for monthly_file in "$LEARNINGS_REPO/rollups/monthly"/*.md; do
    [[ -f "$monthly_file" ]] || continue
    local mlabel
    mlabel="$(basename "$monthly_file" .md)"
    if [[ "$mlabel" == "$year"-* ]]; then
      inputs+=("$monthly_file")
    fi
  done

  if [[ ${#inputs[@]} -eq 0 ]]; then
    return
  fi

  generate_rollup "annual" "$year" "${inputs[@]}"
}

# --- Main: determine what to generate based on current date ---
# Use local time (not UTC) — the nightly runs after midnight local time,
# so "yesterday" is the completed day we want to roll up.

today="$(date +%Y-%m-%d)"
yesterday="$(date -v-1d +%Y-%m-%d 2>/dev/null || date -d 'yesterday' +%Y-%m-%d)"
current_year="$(date +%Y)"
current_month="$(date +%Y-%m)"
current_week="$(date +%V)"
current_year_iso="$(date +%G)"
day_of_week="$(date +%u)"  # 1=Monday, 7=Sunday

# Backfill: find all dates with session summaries that lack a daily rollup
log "Checking for missing daily rollups..."
declare -A session_dates
while IFS= read -r f; do
  fdate="$(head -20 "$f" | grep '^date:' | sed 's/^date: *//' | tr -d ' ')" || true
  if [[ -n "$fdate" && "$fdate" != "$today" ]]; then
    session_dates["$fdate"]=1
  fi
done < <(find "$LEARNINGS_REPO/sessions" -name '*.md' -type f 2>/dev/null)

for d in "${!session_dates[@]}"; do
  if [[ ! -f "$LEARNINGS_REPO/rollups/daily/$d.md" ]]; then
    log "Backfilling daily rollup: $d"
    generate_daily "$d"
  fi
done

# Generate yesterday's daily (the completed day)
generate_daily "$yesterday"

# Regenerate current week's weekly
generate_weekly "$current_year_iso" "$current_week"

# Also regenerate any prior weeks that have daily rollups but no weekly
for daily_file in "$LEARNINGS_REPO/rollups/daily"/*.md; do
  [[ -f "$daily_file" ]] || continue
  daily_date="$(basename "$daily_file" .md)"
  file_week="$(date -jf '%Y-%m-%d' "$daily_date" '+%G-W%V' 2>/dev/null || date -d "$daily_date" '+%G-W%V' 2>/dev/null)" || continue
  if [[ ! -f "$LEARNINGS_REPO/rollups/weekly/$file_week.md" ]]; then
    yw="${file_week%-W*}"
    wn="${file_week#*-W}"
    wn="${wn#0}"  # strip leading zero
    log "Backfilling weekly rollup: $file_week"
    generate_weekly "$yw" "$wn"
  fi
done

# On Sundays: also regenerate current month's monthly
if [[ "$day_of_week" -eq 7 ]]; then
  generate_monthly "$current_month"
fi

# On 1st of month: also regenerate current year's annual
if [[ "$(date +%d)" == "01" ]]; then
  generate_annual "$current_year"
fi

# Commit rollup changes
(cd "$LEARNINGS_REPO" && git add rollups/ && \
  git diff --cached --quiet || \
  git commit -m "Update rollups: $today" --quiet 2>/dev/null) || \
  warn "Failed to commit rollup changes"

log "Done."
