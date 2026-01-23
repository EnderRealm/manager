---
id: m-f6ba
status: closed
deps: [m-f4f1]
links: []
created: 2026-01-19T05:20:28Z
type: task
priority: 3
assignee: Steve Macbeth
parent: m-b0c3
---
# Add service status to dashboard project tiles

Show aggregate service health status on project tiles in dashboard.

## Design

Files: src/client/components/Dashboard.tsx, src/server/routes/projects.ts

Extend /api/projects response to include serviceStatus per project:
- 'healthy': all services running and healthy
- 'degraded': some services stopped or unhealthy
- 'crashed': any service in crashed state
- 'none': no services configured
- 'unknown': services configured but Manager just started

Add small colored dot to project tile:
- Green: healthy
- Yellow: degraded
- Red: crashed
- Gray: none/unknown

Tooltip on hover shows service names and states.

## Acceptance Criteria

- Dashboard shows service status per project
- Colors match status correctly
- Tooltip shows details
- Updates via SSE when status changes

