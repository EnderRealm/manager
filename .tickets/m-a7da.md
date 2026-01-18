---
id: m-a7da
status: closed
deps: [m-689f, m-7c1f]
links: []
created: 2026-01-17T23:03:27Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-2b6b
---
# Kanban board component

Kanban board view with columns for ticket statuses

## Design

Files: src/client/components/KanbanBoard.tsx, src/client/components/TicketCard.tsx, src/client/hooks/useTickets.ts

src/client/hooks/useTickets.ts:
- useTickets(projectId) - fetches all ticket categories
- useTicketMutations(projectId) - start, close, reopen mutations

src/client/components/KanbanBoard.tsx:
- Four columns: In Progress, Ready, Blocked, Closed
- Fetch tickets for each category
- Header with project name, back button

src/client/components/TicketCard.tsx:
- Display: ID, title, type badge, priority indicator
- Click opens ticket detail
- Action buttons: Start, Close, Reopen based on status

## Acceptance Criteria

- Board shows tickets in correct columns
- Cards display ticket info
- Status actions update ticket and refresh board

