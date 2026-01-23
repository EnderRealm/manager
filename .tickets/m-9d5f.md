---
id: m-9d5f
status: closed
deps: []
links: []
created: 2026-01-23T09:00:58Z
type: feature
priority: 2
assignee: Steve Macbeth
parent: m-ae8f
---
# Add service configuration form component

Reusable form component for creating and editing service configurations

## Acceptance Criteria

- Fields for all ServiceConfig properties: id, name, cmd, cwd, port, healthUrl, autoStart, autoRestart, restartDelay, maxRestarts, env
- Validation for required fields (id, cmd)
- ID field disabled when editing (immutable)
- Env vars editor (key-value pairs)
- Form can be used for both create and edit modes

