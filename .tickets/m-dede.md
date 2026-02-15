---
id: m-dede
status: closed
deps: [m-f9bf]
links: []
created: 2026-02-14T22:17:36Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-ba5d
---
# Heatmap component

GitHub-style multi-dot grid heatmap on the Dashboard. Each cell represents one day and shows colored dots per active project. 52-week view with month labels and day-of-week labels. Legend showing project colors and intensity scale.

## Design

Files: src/client/components/ActivityHeatmap.tsx (new), src/client/hooks/useActivity.ts (new), src/client/components/Dashboard.tsx (integrate above heatmap grid).
Approach: Fetch /api/activity data via React Query hook. Render SVG grid: 52 columns (weeks) x 7 rows (days). Each cell contains 1-N small colored circles (one per project active that day). Circle opacity/size driven by token count. Assign each project a distinct hue from a palette. Month labels along top, Mon/Wed/Fri labels on left. Tooltip on hover showing date, projects, session count, tokens. Legend below showing project colors.

## Acceptance Criteria

Heatmap renders on dashboard showing 52 weeks. Multi-dot cells show per-project activity. Hover tooltip with details. Legend with project colors. Responsive to container width.


## Notes

**2026-02-15T01:57:47Z**

Heatmap renders on dashboard with 52-week SVG grid, per-project colored dots, intensity scaling, tooltips, and legend.
