---
id: m-1adc
status: closed
deps: []
links: []
created: 2026-01-19T01:16:50Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ae31
---
# Update ticket detail view with full dependency tree

Show complete dependency hierarchy in ticket detail panel

## Design

Files: src/client/components/TicketDetail.tsx (or similar)

Changes:
- Dependencies section shows full tree, not just direct deps
- Recursively fetch/display: this ticket -> its deps -> their deps -> etc.
- Indentation increases with each level
- Each item clickable to navigate to that ticket

Display format:
```
Dependencies:
  m-1234 Feature A
    m-5678 Task B (blocked by A)
      m-9012 Subtask C (blocked by B)
```

Consider:
- Cycle detection for display (shouldn't happen but defensive)
- Lazy loading if trees get deep
- Collapse/expand for deep trees (optional, YAGNI for now)

## Acceptance Criteria

- Full dependency tree visible in detail view
- Multiple levels displayed with increasing indentation
- Each ticket in tree is clickable for navigation

