---
id: m-2b6b
status: closed
deps: []
links: []
created: 2026-01-17T23:01:15Z
type: epic
priority: 2
assignee: Steve Macbeth
---
# Project Manager Dashboard

Local-only web app to track and manage tk tickets across multiple git repositories

## Design

Stack: TypeScript, React, Hono, Bun, linguist-js, pino

Architecture:
- React SPA frontend with Vite
- Hono API server on Bun
- Direct tk CLI integration (no database)
- Config file for repo paths

UI:
- Dashboard with project tiles showing stats
- Kanban board per project (In Progress, Ready, Blocked, Closed)
- Full CRUD for tickets

## Acceptance Criteria

- Dashboard displays configured projects with ticket stats
- Kanban board shows tickets in correct columns
- Can create, edit, start, close tickets
- Logging to logs/manager.log

