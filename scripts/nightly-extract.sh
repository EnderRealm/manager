#!/usr/bin/env bash
set -euo pipefail

# Nightly extraction: processes unprocessed session summaries and creates tickets.
# Runs as part of the nightly cron pipeline on Mac Studio.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
CODE_ROOT="${CODE_ROOT:-$HOME/code}"
LOG_PREFIX="[nightly-extract]"

log() { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX WARNING: $*" >&2; }

if [[ ! -d "$LEARNINGS_REPO/sessions" ]]; then
  log "No sessions directory in $LEARNINGS_REPO, nothing to do."
  exit 0
fi

# JSON schema for Claude's extraction output
EXTRACT_SCHEMA='{
  "type": "object",
  "properties": {
    "decisions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "ticket_id": { "type": "string" },
          "note": { "type": "string" }
        },
        "required": ["ticket_id", "note"]
      }
    },
    "bugs": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "project": { "type": "string" }
        },
        "required": ["title", "description", "project"]
      }
    },
    "discoveries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "project": { "type": "string" }
        },
        "required": ["title", "description", "project"]
      }
    },
    "incomplete_work": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" },
          "project": { "type": "string" }
        },
        "required": ["title", "description", "project"]
      }
    },
    "workflow_suggestions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "description": { "type": "string" }
        },
        "required": ["title", "description"]
      }
    }
  },
  "required": ["decisions", "bugs", "discoveries", "incomplete_work", "workflow_suggestions"]
}'

EXTRACT_PROMPT='You are analyzing a coding session summary to extract actionable items.

Apply these thresholds strictly — prefer empty arrays to marginal items:

- Decisions: LOW threshold. Attach context to referenced tickets. Skip only if trivial.
- Bugs (unresolved problems): HIGH threshold. Only clearly reproducible, worth-fixing issues. Not transient errors.
- Discoveries: HIGHEST threshold. Only genuinely useful, non-obvious findings that should be added to project CLAUDE.md. Most "discoveries" are just learning what exists — skip those.
- Incomplete work: MEDIUM threshold. Only if there is enough context to resume or create a follow-up. Skip exploratory dead ends.
- Workflow suggestions: HIGHEST threshold. Only clearly beneficial changes to how work is done. These affect every future session.

Rules:
- For decisions, use the ticket_id from the summary. If no ticket is referenced, skip.
- For bugs/discoveries/incomplete_work, set project to the project name from the summary frontmatter.
- For workflow_suggestions, these always target the Powers repo (omit project field).
- Return empty arrays when nothing meets the threshold. This is the expected common case.

Here is the session summary:

'

# Find all unprocessed summaries
processed=0
skipped=0
errors=0

while IFS= read -r summary_file; do
  # Check processed flag in frontmatter
  if head -20 "$summary_file" | grep -q 'processed: true'; then
    skipped=$((skipped + 1))
    continue
  fi

  # Extract project from frontmatter
  project="$(head -20 "$summary_file" | grep '^project:' | sed 's/^project: *//' | tr -d ' ')"
  if [[ -z "$project" ]]; then
    warn "No project in frontmatter: $summary_file"
    errors=$((errors + 1))
    continue
  fi

  project_dir="$CODE_ROOT/$project"
  summary_content="$(cat "$summary_file")"
  filename="$(basename "$summary_file")"

  log "Processing: $filename (project: $project)"

  # Call Claude for extraction
  raw_output="$(claude -p \
    --model haiku \
    --no-session-persistence \
    --output-format json \
    --json-schema "$EXTRACT_SCHEMA" \
    --system-prompt "${EXTRACT_PROMPT}${summary_content}" \
    "Extract actionable items from this session summary. Return JSON." \
    2>/dev/null)" || {
    warn "Claude extraction failed for $filename"
    errors=$((errors + 1))
    continue
  }
  extraction="$(echo "$raw_output" | jq -c '.structured_output // empty')"
  if [[ -z "$extraction" ]]; then
    warn "No structured output from Claude for $filename"
    errors=$((errors + 1))
    continue
  fi

  # Process decisions — attach as notes to referenced tickets
  echo "$extraction" | jq -c '.decisions[]' 2>/dev/null | while IFS= read -r decision; do
    ticket_id="$(echo "$decision" | jq -r '.ticket_id')"
    note="$(echo "$decision" | jq -r '.note')"
    if [[ -d "$project_dir/.tickets" ]]; then
      (cd "$project_dir" && tk add-note "$ticket_id" "$note") 2>/dev/null || \
        warn "Failed to add note to $ticket_id in $project"
    else
      warn "No .tickets/ in $project_dir, skipping decision note for $ticket_id"
    fi
  done

  # Process bugs — create bug tickets in target project
  echo "$extraction" | jq -c '.bugs[]' 2>/dev/null | while IFS= read -r bug; do
    title="$(echo "$bug" | jq -r '.title')"
    desc="$(echo "$bug" | jq -r '.description')"
    target="$(echo "$bug" | jq -r '.project')"
    target_dir="$CODE_ROOT/$target"
    if [[ -d "$target_dir/.tickets" ]]; then
      (cd "$target_dir" && tk create "$title" -t bug -d "$desc" -p 2) 2>/dev/null || \
        warn "Failed to create bug in $target: $title"
    else
      warn "No .tickets/ in $target_dir, skipping bug: $title"
    fi
  done

  # Process discoveries — create CLAUDE.md suggestion tasks
  echo "$extraction" | jq -c '.discoveries[]' 2>/dev/null | while IFS= read -r discovery; do
    title="$(echo "$discovery" | jq -r '.title')"
    desc="$(echo "$discovery" | jq -r '.description')"
    target="$(echo "$discovery" | jq -r '.project')"
    target_dir="$CODE_ROOT/$target"
    if [[ -d "$target_dir/.tickets" ]]; then
      (cd "$target_dir" && tk create "Update CLAUDE.md: $title" -t task -d "$desc" -p 3) 2>/dev/null || \
        warn "Failed to create discovery task in $target: $title"
    else
      warn "No .tickets/ in $target_dir, skipping discovery: $title"
    fi
  done

  # Process incomplete work — create task tickets
  echo "$extraction" | jq -c '.incomplete_work[]' 2>/dev/null | while IFS= read -r item; do
    title="$(echo "$item" | jq -r '.title')"
    desc="$(echo "$item" | jq -r '.description')"
    target="$(echo "$item" | jq -r '.project')"
    target_dir="$CODE_ROOT/$target"
    if [[ -d "$target_dir/.tickets" ]]; then
      (cd "$target_dir" && tk create "$title" -t task -d "$desc" -p 2) 2>/dev/null || \
        warn "Failed to create task in $target: $title"
    else
      warn "No .tickets/ in $target_dir, skipping incomplete work: $title"
    fi
  done

  # Process workflow suggestions — always target Powers repo
  echo "$extraction" | jq -c '.workflow_suggestions[]' 2>/dev/null | while IFS= read -r suggestion; do
    title="$(echo "$suggestion" | jq -r '.title')"
    desc="$(echo "$suggestion" | jq -r '.description')"
    powers_dir="$CODE_ROOT/powers"
    if [[ -d "$powers_dir/.tickets" ]]; then
      (cd "$powers_dir" && tk create "$title" -t task -d "$desc" -p 3 --tags workflow) 2>/dev/null || \
        warn "Failed to create workflow suggestion in powers: $title"
    else
      warn "No .tickets/ in $powers_dir, skipping workflow suggestion: $title"
    fi
  done

  # Mark summary as processed
  sed -i '' 's/^processed: false$/processed: true/' "$summary_file"

  # Commit immediately
  (cd "$LEARNINGS_REPO" && git add "$summary_file" && \
    git commit -m "Mark processed: $filename" --quiet 2>/dev/null) || \
    warn "Failed to commit processed mark for $filename"

  processed=$((processed + 1))

done < <(find "$LEARNINGS_REPO/sessions" -name '*.md' -type f | sort)

log "Done. Processed: $processed, Skipped: $skipped, Errors: $errors"
