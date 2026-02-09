#!/opt/homebrew/bin/bash
set -euo pipefail

# Catch-up script: finds sessions without summaries and generates them via Claude.
# Runs daily on each machine. Also used for initial backfill.

LEARNINGS_REPO="${LEARNINGS_REPO:-$HOME/code/learnings}"
SESSIONS_ROOT="${SESSIONS_ROOT:-$HOME/.claude/projects}"
MIN_ASSISTANT_MESSAGES="${MIN_ASSISTANT_MESSAGES:-3}"
MAX_RETRIES=3
LOG_PREFIX="[catch-up]"

log() { echo "$LOG_PREFIX $*"; }
warn() { echo "$LOG_PREFIX WARNING: $*" >&2; }

if [[ ! -d "$LEARNINGS_REPO/.git" ]]; then
  log "Learnings repo not found at $LEARNINGS_REPO"
  exit 1
fi

if [[ ! -d "$SESSIONS_ROOT" ]]; then
  log "No sessions directory at $SESSIONS_ROOT"
  exit 0
fi

# Pull latest to avoid duplicating existing summaries
(cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || true

# Build index of existing session_ids from learnings repo
declare -A existing_sessions
while IFS= read -r summary_file; do
  sid="$(head -20 "$summary_file" | grep '^session_id:' | sed 's/^session_id: *//' | tr -d ' ')"
  if [[ -n "$sid" ]]; then
    if grep -q 'BEGIN_SESSION_SUMMARY' "$summary_file" && \
       head -20 "$summary_file" | grep -q '^project:' && \
       head -20 "$summary_file" | grep -q '^date:'; then
      existing_sessions["$sid"]=1
    fi
  fi
done < <(find "$LEARNINGS_REPO/sessions" -name '*.md' -type f 2>/dev/null)

# Ensure array is initialized even if empty
existing_sessions+=()
log "Found ${#existing_sessions[@]} existing valid summaries"

SUMMARIZE_PROMPT='You are summarizing a Claude Code session transcript for archival.

IMPORTANT: Do not include secrets, API keys, tokens, passwords, or personal data. Redact with [REDACTED] if referencing sensitive values.

Wrap the entire summary in sentinel markers exactly as shown.

Analyze the conversation and produce:

<!-- BEGIN_SESSION_SUMMARY -->

### Ticket(s)
List ticket ID(s) mentioned in the session (e.g., p-1234, p-5678).
If no tickets, write "None."

### Overview
2-3 sentences: What was accomplished this session.

### Decisions
Bullet list of choices made and why. Include:
- What was decided
- Alternatives considered
- Rationale for the choice
Tag each: (auto) if the assistant decided, (human) if the user decided.
If none, write "None."

### Problems
Bullet list of bugs, blockers, or things that did not work.
Include resolution status: (resolved) or (unresolved).
If none, write "None."

### Discoveries
Bullet list of new understanding gained about the codebase, tools, or domain.
If none, write "None."

### Incomplete Work
Bullet list of work started but not finished.
Include enough context to resume or create a follow-up ticket.
If none, write "None."

<!-- END_SESSION_SUMMARY -->

Output the summary now.'

processed=0
skipped=0
errors=0
too_small=0

# Disable errexit inside the loop — individual failures are handled per-session
set +e
for project_dir in "$SESSIONS_ROOT"/*/; do
  [[ -d "$project_dir" ]] || continue

  for jsonl_file in "$project_dir"*.jsonl; do
    [[ -f "$jsonl_file" ]] || continue

    session_id="$(basename "$jsonl_file" .jsonl)"

    # Skip if already summarized
    if [[ -n "${existing_sessions[$session_id]:-}" ]]; then
      skipped=$((skipped + 1))
      continue
    fi

    # Count assistant messages to filter tiny sessions
    assistant_count="$(grep -c '"type":"assistant"' "$jsonl_file" 2>/dev/null || true)"
    assistant_count="${assistant_count:-0}"
    if [[ "$assistant_count" -lt "$MIN_ASSISTANT_MESSAGES" ]]; then
      too_small=$((too_small + 1))
      continue
    fi

    # Extract project name and cwd from first message with cwd field
    cwd="$(grep -m1 '"cwd"' "$jsonl_file" | python3 -c "import json,sys; print(json.loads(sys.stdin.readline()).get('cwd',''))" 2>/dev/null || echo "")"
    if [[ -z "$cwd" ]]; then
      warn "No cwd in $jsonl_file, skipping"
      errors=$((errors + 1))
      continue
    fi

    project="$(basename "$cwd")"

    # Extract date and branch from first message with a timestamp
    read -r session_date branch < <(python3 - "$jsonl_file" <<'PYEOF'
import json, sys
for line in open(sys.argv[1]):
    try:
        obj = json.loads(line)
        ts = obj.get('timestamp', '')
        if ts:
            print(ts[:10], obj.get('gitBranch', 'unknown'))
            sys.exit()
    except: pass
print('unknown', 'unknown')
PYEOF
) || { session_date="unknown"; branch="unknown"; }

    log "Summarizing: $session_id (project: $project, date: $session_date)"

    # Extract conversation content for Claude.
    # Pull user prompts and assistant text responses, skip tool calls and binary data.
    transcript="$(python3 - "$jsonl_file" <<'PYEOF'
import json, sys

lines = open(sys.argv[1]).readlines()
parts = []
for line in lines:
    obj = json.loads(line)
    t = obj.get('type')
    if t == 'user':
        msg = obj.get('message', {})
        if isinstance(msg, dict):
            content = msg.get('content', [])
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get('type') == 'text':
                        parts.append('USER: ' + block['text'][:2000])
            elif isinstance(content, str):
                parts.append('USER: ' + content[:2000])
    elif t == 'assistant':
        msg = obj.get('message', {})
        content = msg.get('content', [])
        if isinstance(content, list):
            for block in content:
                if isinstance(block, dict) and block.get('type') == 'text':
                    parts.append('ASSISTANT: ' + block['text'][:2000])

output = '\n\n'.join(parts)
if len(output) > 50000:
    output = output[:50000] + '\n\n[TRUNCATED]'
print(output)
PYEOF
)" || {
      warn "Failed to extract transcript for $session_id"
      errors=$((errors + 1))
      continue
    }

    if [[ -z "$transcript" ]]; then
      warn "Empty transcript for $session_id"
      too_small=$((too_small + 1))
      continue
    fi

    # Call Claude to summarize
    summary_body="$(echo "$transcript" | claude -p \
      --model haiku \
      --no-session-persistence \
      --system-prompt "$SUMMARIZE_PROMPT" \
      "Summarize this coding session transcript." \
      2>/dev/null)" || {
      warn "Claude summarization failed for $session_id"
      errors=$((errors + 1))
      continue
    }

    # Verify sentinel markers are present
    if ! echo "$summary_body" | grep -q 'BEGIN_SESSION_SUMMARY'; then
      warn "No sentinel markers in Claude output for $session_id"
      errors=$((errors + 1))
      continue
    fi

    # Parse ticket IDs from body
    tickets="$(echo "$summary_body" | grep -oE 'p-[0-9a-f]{4}' | sort -u | jq -R . | jq -sc .)"

    # Write summary file
    session_dir="$LEARNINGS_REPO/sessions/$project"
    mkdir -p "$session_dir"
    output_file="$session_dir/${session_date}-${session_id}.md"

    cat > "$output_file" <<ENDFILE
---
project: $project
session_id: $session_id
date: $session_date
branch: $branch
tickets: $tickets
processed: false
---

$summary_body
ENDFILE

    # Commit
    (cd "$LEARNINGS_REPO" && git add "$output_file" && \
      git commit -m "Add catch-up summary: $project $session_date $session_id" --quiet 2>/dev/null) || \
      warn "Failed to commit summary for $session_id"

    processed=$((processed + 1))
  done
done
set -e

# Push all at once
if [[ "$processed" -gt 0 ]]; then
  log "Pushing $processed summaries..."
  for i in $(seq 1 $MAX_RETRIES); do
    if (cd "$LEARNINGS_REPO" && git push --quiet 2>/dev/null); then
      break
    fi
    (cd "$LEARNINGS_REPO" && git pull --rebase --quiet 2>/dev/null) || true
  done
fi

log "Done. Processed: $processed, Skipped: $skipped, Too small: $too_small, Errors: $errors"
