---
id: m-ac44
status: closed
deps: [m-94da]
links: []
created: 2026-02-01T19:44:14Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-e4de
---
# Create launchd plist generation script

Create a script that generates all three launchd plist files for the production services and optionally installs them.

## Design

Files: scripts/generate-plists.sh (new)

Generate three plists to ~/Library/LaunchAgents/:

1. com.manager.server.plist:
   - Program: bun run src/server/index.ts
   - WorkingDirectory: ~/.local/services/manager
   - EnvironmentVariables: NODE_ENV=production, PORT=3100, CONFIG_PATH=~/.local/services/manager/config.json
   - RunAtLoad: true
   - KeepAlive: true
   - ThrottleInterval: 10
   - StandardOutPath/StandardErrorPath: ~/Library/Logs/Manager/server.log

2. com.manager.deployer.plist:
   - Program: ~/.local/services/manager/scripts/deployer.sh
   - WorkingDirectory: ~/.local/services/manager
   - RunAtLoad: true
   - KeepAlive: true
   - ThrottleInterval: 300 (5 min poll interval via restart cycle)
   - StandardOutPath/StandardErrorPath: ~/Library/Logs/Manager/deployer.log

3. com.manager.caddy.plist:
   - Program: caddy run --config ~/.local/services/caddy/Caddyfile
   - EnvironmentVariables: CLOUDFLARE_API_TOKEN (read from file or env)
   - RunAtLoad: true
   - KeepAlive: true
   - StandardOutPath/StandardErrorPath: ~/Library/Logs/Manager/caddy.log

Script flags:
  --install: copy plists to ~/Library/LaunchAgents/ and launchctl bootstrap
  --uninstall: launchctl bootout and remove plists
  No flag: print plists to stdout for review

## Acceptance Criteria

- Running script generates valid plist XML for all three services
- --install flag loads all services into launchctl
- --uninstall flag cleanly removes all services
- Paths are expanded correctly (no literal ~ in plists)

