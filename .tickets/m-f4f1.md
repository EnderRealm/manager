---
id: m-f4f1
status: closed
deps: [m-0d3b, m-8d1e]
links: []
created: 2026-01-19T05:19:46Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Create useServices hook

React hook to fetch and manage service state, with SSE updates.

## Design

Files: src/client/hooks/useServices.ts

Hook: useServices(projectId: string)

Returns:
- services: ServiceStatus[] (from react-query)
- startService(serviceId): mutation
- stopService(serviceId): mutation
- restartService(serviceId): mutation

Use react-query for data fetching.
Listen to SSE service-status events and invalidate query on change.
Handle loading/error states.

## Acceptance Criteria

- Hook returns service list with status
- Mutations work for start/stop/restart
- UI updates in real-time via SSE
- Loading and error states handled

