---
id: m-4fd7
status: closed
deps: []
links: []
created: 2026-02-14T22:17:21Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Patterns API endpoint

Read and parse pattern files from ~/code/learnings/patterns/. Serve active patterns with status, evidence, occurrences, and suggested actions.

## Design

Files: src/server/routes/activity.ts (add to same route file), src/server/services/learnings.ts (extend).
Approach: Parse ~/code/learnings/patterns/ptr-*.md files. Extract frontmatter (id, status, first_seen, last_seen, occurrences, projects) and body sections (Description, Evidence, Suggested Action). Endpoint: GET /api/patterns returns { patterns: [{ id, status, description, evidence, suggestedAction, occurrences, projects, firstSeen, lastSeen }] }.

## Acceptance Criteria

GET /api/patterns returns all pattern files parsed with full metadata. Filterable by status (observation|pattern|actioned|resolved).


## Notes

**2026-02-15T01:54:09Z**

GET /api/patterns with status filter. 10 patterns parsed with deduped evidence.
