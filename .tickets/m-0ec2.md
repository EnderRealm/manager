---
id: m-0ec2
status: open
deps: []
links: []
created: 2026-02-21T00:42:47Z
type: epic
priority: 1
assignee: Steve Macbeth
tags: [backend, frontend, agents]
---
# Agent Work Queue

Orchestrate batch AI agent execution across projects. Queue multiple ready tickets for agent processing, execute sequentially per project (parallel across projects), auto-advance on success, pause on failure. Transforms manual one-at-a-time agent runs into batch operations.

## Design

## Components

### Queue Model
- Per-project ordered queue of ticket IDs
- Queue states: idle, running, paused (on failure)
- Persistent across server restarts (write to config or dedicated queue file)

### Backend (agent-runner.ts extension)
- POST /api/projects/:id/agents/queue — add tickets to queue
- DELETE /api/projects/:id/agents/queue/:ticketId — remove from queue
- POST /api/projects/:id/agents/queue/pause — pause queue
- POST /api/projects/:id/agents/queue/resume — resume queue
- GET /api/projects/:id/agents/queue — current queue state
- On agent run completion: if success, pop next ticket and start; if failure, pause and notify

### Frontend
- Multi-select on KanbanBoard (checkbox mode or shift-click)
- 'Queue for agent' bulk action button
- Queue panel in ServicesView or dedicated tab showing: queued tickets, current execution, completed results
- Queue progress indicator on project card in Dashboard

### Cross-project orchestration
- Global queue view showing all project queues
- Concurrency limit: max N agents running simultaneously across all projects

## Acceptance Criteria

- Can select multiple tickets from board and queue them
- Queue executes tickets sequentially within a project
- Queue pauses on agent failure with clear status
- Can view queue state and remove/reorder items
- Queue survives server restart
- Dashboard shows queue depth per project

