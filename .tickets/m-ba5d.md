---
id: m-ba5d
status: closed
deps: []
links: []
created: 2026-02-14T22:17:01Z
type: epic
priority: 1
assignee: Steve Macbeth
---
# Activity Tracker & Insights Dashboard

GitHub-style activity heatmap on the dashboard with per-project color-coded dots, learnings/patterns exposure, and a dedicated insights page. Draws data from the learnings repo session summaries, rollups, and patterns.

## Design

Heatmap: multi-dot grid, each day shows colored dots per active project. Intensity driven by token count (message_count fallback for historical data). Learnings/patterns on dashboard summary + full Insights page. Data source: ~/code/learnings/ (sessions/, rollups/, patterns/). New API routes: /api/activity, /api/patterns, /api/learnings. Cross-repo: powers hooks need token tracking update.

## Acceptance Criteria

Heatmap renders 52 weeks of activity on dashboard with per-project color coding. Active patterns and recent discoveries shown below heatmap. Dedicated /insights page with full learnings browser, pattern list, and activity breakdowns.


## Notes

**2026-02-14T22:18:20Z**

Cross-repo ticket: p-fcd1 (powers) — Add token tracking to session summaries
