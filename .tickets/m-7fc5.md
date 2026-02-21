---
id: m-7fc5
status: open
deps: []
links: []
created: 2026-02-21T21:48:10Z
type: epic
priority: 2
assignee: Steve Macbeth
tags: [frontend, backend, ux]
---
# Command Palette (⌘K)

Global fuzzy-search command palette for fast navigation across all entities (projects, tickets, services) and quick actions. Triggered by ⌘K shortcut (already stubbed in header). Essential power-user UX for scaling beyond ~50 tickets.

## Design

## Components

### Search Index
- In-memory index built on server from: projects, tickets (all statuses), services
- Each entry: { type, id, title, subtitle, projectId, url, keywords }
- Rebuild on ticket/service change events (leverage existing watcher)
- Fuzzy matching (substring + token matching, no heavy library needed)

### Backend
- GET /api/search?q=term — returns ranked results across all entity types
- Results grouped by type: projects, tickets, services
- Include recent items (last 10 visited) when query is empty

### Frontend
- Modal overlay triggered by ⌘K (or clicking existing search button)
- Input with real-time results as you type (debounced 150ms)
- Keyboard navigation: arrow keys to select, Enter to navigate, Esc to close
- Result sections: Recent, Projects, Tickets, Services, Actions
- Actions section: 'Create ticket', 'Go to settings', 'Go to insights'
- Highlight matching text in results

### Quick Actions
- 'Create ticket in [project]' — opens create form
- 'Start/stop [service]' — direct service control
- 'Run agent on [ticket]' — triggers agent run

## Acceptance Criteria

- ⌘K opens command palette from anywhere in the app
- Fuzzy search across projects, tickets, and services
- Keyboard-navigable (arrows, enter, escape)
- Results appear within 200ms of typing
- Empty state shows recent items
- Selecting a result navigates to the correct page
- Quick actions work without navigating away

