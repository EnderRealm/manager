---
id: m-ff9a
status: open
deps: [m-7f0c]
links: []
created: 2026-02-15T04:25:04Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-6ba5
---
# Integrate git pull on SSE connect

Trigger a git pull when a client connects to a project's SSE endpoint, so ticket data is fresh before the watcher starts.

## Design

Files: src/server/routes/events.ts

In the SSE route handler, before the existing watchProject() call:
1. await gitPull(projectPath, projectId)
2. Pull result doesn't gate the connection - if it fails, sync status is set to error but SSE proceeds normally
3. The watcher then starts on up-to-date files

## Acceptance Criteria

Navigating to a project in the UI triggers git pull. Stale ticket data from remote is pulled in and visible. Pull failure sets sync status to error but does not block the UI.

