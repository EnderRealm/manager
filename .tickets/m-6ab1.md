---
id: m-6ab1
status: closed
deps: []
links: []
created: 2026-01-19T02:42:25Z
type: bug
priority: 3
assignee: Steve Macbeth
---
# Fix TypeScript error: ColumnId possibly undefined in handleSwipe

KanbanBoard.tsx:510 - swipeColumns[targetIndex] can be undefined but isValidTransition expects ColumnId

