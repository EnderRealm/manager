---
id: m-0d3b
status: closed
deps: [m-df46]
links: []
created: 2026-01-19T05:19:21Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Add services API routes

REST endpoints for service management - list, start, stop, restart, logs.

## Design

Files: src/server/routes/services.ts, src/server/index.ts

Routes:
- GET /api/projects/:id/services - list services with current status
- POST /api/projects/:id/services/:sid/start - start service
- POST /api/projects/:id/services/:sid/stop - stop service
- POST /api/projects/:id/services/:sid/restart - restart service
- GET /api/projects/:id/services/:sid/logs?lines=200 - get tmux scrollback

Response format for list:
[{ id, name, status, port, healthUrl, lastCheck, error? }]

Wire up routes in index.ts.
Return appropriate errors for unknown project/service.

## Acceptance Criteria

- All endpoints return correct responses
- 404 for unknown project/service
- Start/stop/restart work via API
- Logs endpoint returns recent output

