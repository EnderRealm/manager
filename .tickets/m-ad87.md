---
id: m-ad87
status: open
deps: []
links: []
created: 2026-01-19T01:17:19Z
type: feature
priority: 2
assignee: Steve Macbeth
---
# Mobile swipe-based dependency management

Add swipe gestures for managing dependencies on mobile devices

## Design

Current: Mobile uses swipe left/right for status changes. Dependencies managed via detail view only.

Future enhancement: Swipe-based dependency creation/removal on mobile.

Possible approaches:
- Long-press to enter dependency mode, then swipe to target
- Two-finger swipe to add dependency
- Swipe up/down for dependency actions (vs left/right for status)

Needs UX research and prototyping before implementation.

## Acceptance Criteria

- Users can add/remove dependencies via touch gestures
- Discoverable interaction pattern
- Works alongside existing status swipe gestures

