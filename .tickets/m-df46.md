---
id: m-df46
status: closed
deps: [m-5cf9]
links: []
created: 2026-01-19T05:19:11Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Create process manager service

Core service that tracks service state, handles health checks, auto-restart logic, and orphan adoption.

## Design

Files: src/server/services/process-manager.ts

State tracking:
- Map<string, Map<string, ServiceState>> keyed by projectId then serviceId
- ServiceState: { status, pid?, lastHealthCheck?, restartCount, restartWindowStart }

Functions:
- initialize(): scan for orphans, start autoStart services
- startService(projectId, serviceId): create tmux session, update state
- stopService(projectId, serviceId): kill session, update state
- restartService(projectId, serviceId): stop then start
- getServiceStatus(projectId, serviceId): return current state
- getAllServices(projectId): return all services with status

Health check loop (setInterval 5s):
- For each tracked service, check tmux session exists
- If healthUrl configured, HTTP GET with 3s timeout
- If port configured and no healthUrl, check port listening
- Update state, trigger auto-restart if needed

Auto-restart logic:
- Track restarts in rolling 5min window
- If exceeds maxRestarts, set status to 'crashed'
- Emit events for UI updates

## Acceptance Criteria

- Services tracked in memory
- Health checks run every 5 seconds
- Auto-restart works with configurable limits
- Orphan sessions adopted on startup
- State changes emit events

