---
id: m-0ad2
status: closed
deps: []
links: []
created: 2026-02-14T22:17:25Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Learnings API endpoint

Read and parse rollups and recent session discoveries from ~/code/learnings/. Serve structured learnings data including decisions, discoveries, and weekly/monthly summaries.

## Design

Files: src/server/routes/activity.ts (add to same route file), src/server/services/learnings.ts (extend).
Approach: Parse ~/code/learnings/rollups/{daily,weekly,monthly}/*.md for aggregated summaries. Parse recent session summaries for Decisions and Discoveries sections. Endpoint: GET /api/learnings?period=week|month returns { rollup: { summary, keyOutcomes, decisions, openItems }, recentDiscoveries: [...], recentDecisions: [...] }.

## Acceptance Criteria

GET /api/learnings returns latest rollup data and recent discoveries/decisions from session summaries.


## Notes

**2026-02-15T01:54:09Z**

GET /api/learnings with period param. Returns latest rollup + 10 recent discoveries/decisions.
