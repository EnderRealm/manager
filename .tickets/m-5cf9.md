---
id: m-5cf9
status: closed
deps: [m-fc2f]
links: []
created: 2026-01-19T05:18:47Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-b0c3
---
# Create tmux service for session management

Create service to manage tmux sessions - start, stop, check status, capture logs.

## Design

Files: src/server/services/tmux.ts

Functions:
- checkTmuxInstalled(): Promise<boolean> - verify tmux available
- sessionExists(sessionName: string): Promise<boolean> - tmux has-session
- createSession(name: string, cwd: string, cmd: string, env?: Record<string,string>): Promise<void> - tmux new-session -d
- killSession(name: string): Promise<void> - send SIGINT, wait 10s, then kill-session
- captureLogs(name: string, lines?: number): Promise<string> - tmux capture-pane
- listSessions(prefix: string): Promise<string[]> - list mgr-* sessions for orphan detection

Session naming: mgr-{projectId}-{serviceId}

Use spawn with proper error handling. Log all tmux commands.

## Acceptance Criteria

- Can create/kill tmux sessions
- Can check if session exists
- Can capture scrollback output
- Graceful shutdown with SIGINT then SIGKILL
- Works when tmux not installed (returns appropriate errors)

