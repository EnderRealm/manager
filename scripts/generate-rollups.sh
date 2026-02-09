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

Synthesize the inputs into a cohesive summary. Do not simply concatenate — identify themes, highlight key outcomes, and note patterns.

Sections to produce:

### Summary
Brief narrative of work across all projects during this period.

### Key Outcomes
Bullet list of what was accomplished.

### Decisions Made
Bullet list of significant decisions, preserving (auto)/(human) tags.

### Open Items
Bullet list of unresolved problems or incomplete work carried forward.

### Patterns
Bullet list of any active patterns observed (reference pattern IDs if known).

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

  # Collect input content
  local combined=""
  local projects=()
  local session_count=0
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
      # Parse [a, b, c] format
      for p in $(echo "$projs_line" | tr -d '[]' | tr ',' '\n' | tr -d ' '); do
        projects+=("$p")
      done
    fi
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

  # Call Claude to generate rollup
  local body
  body="$(echo "$combined" | claude -p \
    --model haiku \
    --no-session-persistence \
    --system-prompt "$ROLLUP_PROMPT" \
    "Generate a $level rollup for $date_label from these inputs." \
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

today="$(date -u +%Y-%m-%d)"
current_year="$(date -u +%Y)"
current_month="$(date -u +%Y-%m)"
current_week="$(date -u +%V)"
current_year_iso="$(date -u +%G)"
day_of_week="$(date -u +%u)"  # 1=Monday, 7=Sunday

# Always: regenerate today's daily and current week's weekly
generate_daily "$today"
generate_weekly "$current_year_iso" "$current_week"

# On Sundays: also regenerate current month's monthly
if [[ "$day_of_week" -eq 7 ]]; then
  generate_monthly "$current_month"
fi

# On 1st of month: also regenerate current year's annual
if [[ "$(date -u +%d)" == "01" ]]; then
  generate_annual "$current_year"
fi

# Commit rollup changes
(cd "$LEARNINGS_REPO" && git add rollups/ && \
  git diff --cached --quiet || \
  git commit -m "Update rollups: $today" --quiet 2>/dev/null) || \
  warn "Failed to commit rollup changes"

log "Done."
