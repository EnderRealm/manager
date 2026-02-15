---
id: m-f9bf
status: closed
deps: []
links: []
created: 2026-02-14T22:17:17Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Activity data API endpoint

Read and parse session summaries from ~/code/learnings/sessions/. Serve daily activity data with per-project breakdown including token counts (message_count fallback). Endpoint: GET /api/activity?range=year|6months|3months

## Design

Files: src/server/routes/activity.ts (new), src/server/services/learnings.ts (new), src/server/index.ts (mount route).
Approach: Create learnings service that reads ~/code/learnings/sessions/**/*.md, parses YAML frontmatter (date, project, message_count, tool_uses, files_touched, token_count). Aggregates by day+project. Cache parsed data in memory with file mtime invalidation. Route returns { days: [{ date, projects: [{ name, tokenCount, messageCount, sessions }], total }] }.

## Acceptance Criteria

GET /api/activity returns 365 days of activity data. Each day has per-project breakdown. Handles missing token_count gracefully with message_count fallback.


## Notes

**2026-02-15T01:38:38Z**

Implemented and tested. GET /api/activity returns 365 days, per-project breakdown with tokenCount/messageCount/sessions.
