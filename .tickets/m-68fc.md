---
id: m-68fc
status: closed
deps: [m-b18d, m-9d5f]
links: []
created: 2026-01-23T09:01:36Z
type: feature
priority: 2
assignee: Steve Macbeth
parent: m-ae8f
---
# Add create service modal/page

UI flow to create a new service for a project

## Acceptance Criteria

- Accessible from service list view
- Uses service configuration form component
- Calls POST /projects/:id/services on submit
- Shows success/error feedback
- Refreshes service list on success

