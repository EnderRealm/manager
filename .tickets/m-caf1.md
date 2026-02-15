---
id: m-caf1
status: closed
deps: [m-e33e]
links: []
created: 2026-02-14T22:17:47Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Insights page

Dedicated /insights route with full learnings browser, pattern list with status and evidence, activity breakdown charts, and decision log. The deep-dive view for all nightly pipeline output.

## Design

Files: src/client/components/InsightsPage.tsx (new), src/client/App.tsx (add route), src/client/components/Layout.tsx or Sidebar (add nav link).
Approach: Three sections — (1) Patterns: list with status badges (observation/pattern/actioned/resolved), occurrence count, project tags, expandable evidence and suggested actions. (2) Learnings: browsable list of discoveries and decisions from sessions, filterable by project and date. (3) Activity: detailed breakdown charts — sessions per project over time, weekly totals, outcome distribution. Use existing theme colors.

## Acceptance Criteria

Route /insights renders. Patterns list with expandable detail. Learnings browser with project/date filters. Activity charts. Navigation from sidebar and dashboard summary.


## Notes

**2026-02-15T02:13:28Z**

Three-tab Insights page with patterns list, learnings browser, and activity breakdowns. Sidebar nav link added.
