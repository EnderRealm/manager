---
id: m-fc2f
status: closed
deps: []
links: []
created: 2026-01-19T05:18:32Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Update config schema for services

Extend config.json schema and TypeScript types to support service definitions per project.

## Design

Files: src/server/lib/config.ts, config.json

Add ServiceConfig interface:
- id: string (unique within project)
- name: string (display name)
- cmd: string (command to run)
- cwd?: string (relative to project path, defaults to '.')
- port?: number (for health check/orphan detection)
- healthUrl?: string (HTTP endpoint to poll)
- autoStart?: boolean (start on Manager launch)
- autoRestart?: boolean (restart on crash)
- restartDelay?: number (ms before restart, default 3000)
- maxRestarts?: number (in 5min window, default 5)
- env?: Record<string, string>

Add services?: ServiceConfig[] to ProjectConfig interface.
Update loadConfig to parse and validate services array.

## Acceptance Criteria

- TypeScript types defined
- Config loads without error with services array
- Missing optional fields get defaults
- Invalid config throws descriptive error

