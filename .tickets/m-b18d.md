---
id: m-b18d
status: closed
deps: []
links: []
created: 2026-01-23T08:59:07Z
type: feature
priority: 2
assignee: Steve Macbeth
parent: m-ae8f
---
# Add API endpoints for service CRUD

Add REST endpoints to manage service configurations in config.json

## Acceptance Criteria

- POST /projects/:id/services - create new service
- PUT /projects/:id/services/:sid - update service config
- DELETE /projects/:id/services/:sid - remove service
- Validate service config (id uniqueness, required fields)
- Return appropriate errors for invalid configs

