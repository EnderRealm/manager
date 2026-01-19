---
id: m-ae31
status: closed
deps: []
links: []
created: 2026-01-19T01:14:17Z
type: epic
priority: 2
assignee: Steve Macbeth
---
# Kanban Dependency Visualization and Management

Visual dependency hierarchy in Kanban columns with drag-and-drop dependency management

## Design

Card Layout: Header row with ID (left), Type (center), Priority (right). Title on second row - full/wrapping for parents, truncated for children. Children indented ~16-20px with muted styling.

Display Logic: In Progress, Ready, Closed columns show direct dependents inline (one level max). Blocked column stays flat. Full dependency tree in ticket detail only.

Drag-and-Drop: Drop on column = status change (existing). Drop on card = add dependency (dropped becomes blocked by target). Drag child to column = remove dependency + set status. Card highlight on valid targets. Silent block on circular deps.

Mobile: Inline hierarchy displays read-only. Deps managed via detail view only.

## Acceptance Criteria

- Cards display ID/Type/Priority header layout
- Dependent tickets appear indented under blockers in all columns except Blocked
- Dragging onto a card creates dependency relationship
- Dragging child to column removes dependency
- Circular dependencies prevented
- Mobile shows hierarchy read-only

