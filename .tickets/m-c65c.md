---
id: m-c65c
status: closed
deps: [m-b18d]
links: []
created: 2026-01-23T09:01:54Z
type: feature
priority: 2
assignee: Steve Macbeth
parent: m-ae8f
---
# Add delete service confirmation

UI flow to delete a service configuration

## Acceptance Criteria

- Delete button in service list view
- Confirmation dialog before deletion
- If service is running, stop it first or warn user
- Calls DELETE /projects/:id/services/:sid
- Shows success/error feedback
- Refreshes service list on success

