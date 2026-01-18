---
id: m-7c1f
status: closed
deps: [m-9b02]
links: []
created: 2026-01-17T23:03:21Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-2b6b
---
# Ticket API routes

API endpoints for ticket CRUD and status changes

## Design

Files: src/server/routes/tickets.ts

Endpoints:
- GET /api/projects/:id/tickets - all tickets
- GET /api/projects/:id/tickets/ready - ready tickets
- GET /api/projects/:id/tickets/blocked - blocked tickets  
- GET /api/projects/:id/tickets/closed - last 10 closed
- GET /api/projects/:id/tickets/:ticketId - single ticket
- POST /api/projects/:id/tickets - create ticket
- PATCH /api/projects/:id/tickets/:ticketId - update ticket
- POST /api/projects/:id/tickets/:ticketId/start
- POST /api/projects/:id/tickets/:ticketId/close
- POST /api/projects/:id/tickets/:ticketId/reopen

Validation:
- Check project exists before all operations
- Validate required fields on create

## Acceptance Criteria

- All CRUD operations work
- Status changes update ticket correctly
- Errors return appropriate HTTP codes

