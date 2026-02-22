---
id: m-6ba5
status: closed
deps: []
links: []
created: 2026-02-15T04:24:45Z
type: epic
priority: 1
assignee: Steve Macbeth
---
# Git Sync for Ticket Changes

Ticket changes made through the manager UI are never committed or pushed to git. Tickets created on other machines are never pulled down. The manager needs a git sync layer.

## Design

Two capabilities:
OUTBOUND: After ticket mutations via the UI, debounced commit+push (30s after last activity). Fire-and-forget, failures logged.
INBOUND: git pull --ff-only when a client opens a project (SSE connect). File watcher handles UI updates from pulled changes.

Sync status tracked per project (synced|pending|error). Surfaced on dashboard tiles and project detail header. No toasts/modals - persistent indicator that clears on recovery.

Key files: git.ts (existing execGit), git-sync.ts (new), events.ts (pull trigger), tickets.ts (schedule trigger), projects.ts (status in summary), useTicketEvents.ts (sync-status SSE event).

## Acceptance Criteria

Tickets created/edited in manager UI are committed and pushed after 30s inactivity. Opening a project pulls latest from remote. Sync errors visible in UI.

