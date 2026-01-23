---
id: m-8d1e
status: closed
deps: [m-df46]
links: []
created: 2026-01-19T05:19:32Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Add service events to SSE endpoint

Extend existing SSE endpoint to broadcast service status changes.

## Design

Files: src/server/routes/events.ts, src/server/services/process-manager.ts

Add event types:
- service-status: { serviceId, status, error? }

Process manager emits events when:
- Service starts/stops
- Health check status changes
- Service crashes
- Auto-restart triggered

Modify events.ts to subscribe to process manager events and broadcast to connected clients for that project.

## Acceptance Criteria

- SSE clients receive service status updates
- Updates are real-time (within health check interval)
- Only receives events for subscribed project

