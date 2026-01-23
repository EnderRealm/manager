---
id: m-b0c3
status: closed
deps: []
links: []
created: 2026-01-19T05:12:03Z
type: epic
priority: 1
assignee: Steve Macbeth
---
# Process Management for Project Services

Add ability to manage persistent shell commands (services) per project. Start/stop services, monitor health, auto-restart on crash, view logs.

## Design

## Architecture

**tmux-based persistence:** Each service runs in a dedicated tmux session named `mgr-{projectId}-{serviceId}`. Sessions survive Manager restarts and can be attached for debugging.

**Configuration:** Services defined in config.json per project with fields: id, name, cmd, cwd, port, healthUrl, autoStart, autoRestart, restartDelay, maxRestarts, env.

**Health checking:** Hybrid approach - process alive (tmux session exists) plus optional HTTP health endpoint or port listening check. Poll every 5 seconds.

**States:** stopped, starting, running, unhealthy, crashed, restarting

**Orphan adoption:** On startup, scan for existing mgr-* tmux sessions and adopt them into Manager's control.

## UI
- Dashboard: status dot on project tiles
- Project header: Services dropdown with start/stop/restart controls
- Logs panel: tmux scrollback viewer with auto-refresh

## Acceptance Criteria

- Can define services in config.json
- Services start/stop via UI
- Auto-start on Manager launch
- Auto-restart on crash with limits
- Health status visible in UI
- Can view logs in UI
- tmux attach works for debugging

