---
id: m-7cb8
status: closed
deps: [m-a7da]
links: []
created: 2026-01-17T23:03:29Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-2b6b
---
# Ticket detail and edit forms

Ticket detail view and create/edit forms

## Design

Files: src/client/components/TicketDetail.tsx, src/client/components/TicketForm.tsx

src/client/components/TicketDetail.tsx:
- Modal or slide-over panel
- Display all ticket fields
- Edit button opens form
- Status action buttons

src/client/components/TicketForm.tsx:
- Form for create and edit
- Fields: title, description, design, acceptance, type, priority, assignee, parent
- Validation for required fields
- Submit calls create or update API

## Acceptance Criteria

- Can view full ticket details
- Can create new tickets
- Can edit existing tickets
- Form validation works

