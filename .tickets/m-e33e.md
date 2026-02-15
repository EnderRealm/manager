---
id: m-e33e
status: closed
deps: [m-4fd7, m-0ad2, m-dede]
links: []
created: 2026-02-14T22:17:42Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Dashboard learnings summary

Summary section below heatmap on dashboard showing active patterns count, recent discoveries, and weekly stats. Quick glance at what the nightly pipeline has surfaced.

## Design

Files: src/client/components/LearningSummary.tsx (new), src/client/hooks/usePatterns.ts (new), src/client/hooks/useLearnings.ts (new), src/client/components/Dashboard.tsx (add below heatmap).
Approach: Fetch /api/patterns and /api/learnings. Display: active patterns count with status badges, last 3-5 discoveries as compact cards, this week stats (sessions, files touched, decisions made). Link to /insights for full view. Keep compact — 2-3 rows max.

## Acceptance Criteria

Summary section renders below heatmap. Shows active pattern count, recent discoveries, weekly stats. Links to insights page for detail.


## Notes

**2026-02-15T02:00:32Z**

Three-card summary section rendering below heatmap. Pattern counts, recent discoveries, weekly stats.
