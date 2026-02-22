---
id: m-7f0c
status: closed
deps: []
links: []
created: 2026-02-15T04:24:55Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-6ba5
---
# Create git sync service with pull and commit+push

Core git sync service with pull and commit+push functions, sync status tracking, and debounced scheduling.

## Design

Files: src/server/services/git-sync.ts (new), src/server/services/git.ts (export execGit)

1. Export execGit from git.ts so git-sync.ts can reuse it.
2. Create git-sync.ts with:
   - SyncStatus type: { state: synced|pending|error, error?: string, lastSynced?: number }
   - Per-project syncStatus map
   - gitPull(projectPath, projectId) - runs git pull --ff-only, sets error on failure
   - gitCommitAndPush(projectPath, projectId) - runs git add .tickets/ && git commit && git push, sets error on failure, no-ops if nothing to commit
   - scheduleSyncForProject(projectId, projectPath) - resets 30s debounce timer per project, sets status to pending, fires gitCommitAndPush when timer expires
   - getSyncStatus(projectId) - returns current sync status
   - Broadcast mechanism: onSyncStatusChange(handler) pattern matching watcher.ts

## Acceptance Criteria

execGit shared between git.ts and git-sync.ts. gitPull and gitCommitAndPush work correctly. Debounce timer resets on each call. Sync status transitions correctly between synced/pending/error.

