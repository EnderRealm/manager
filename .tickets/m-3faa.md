---
id: m-3faa
status: closed
deps: [m-5cf9]
links: []
created: 2026-01-19T05:20:39Z
type: task
priority: 3
assignee: Steve Macbeth
parent: m-b0c3
---
# Handle tmux not installed gracefully

Graceful degradation when tmux is not available on the system.

## Design

Files: src/server/services/tmux.ts, src/server/services/process-manager.ts, src/client/components/ServicesDropdown.tsx

On server startup:
- Check tmux installed via checkTmuxInstalled()
- If not installed, log warning and set tmuxAvailable = false
- Process manager skips all operations, returns empty/error states

API responses include tmuxAvailable: boolean field.

Client UI:
- If tmuxAvailable is false, show message instead of service controls
- Message: 'Install tmux to manage services'

## Acceptance Criteria

- Manager starts without tmux
- Clear message shown in UI
- No crashes or errors in logs
- Services config still loads (just can't run)

