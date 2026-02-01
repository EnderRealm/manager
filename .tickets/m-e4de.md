---
id: m-e4de
status: closed
deps: []
links: []
created: 2026-02-01T19:40:45Z
type: epic
priority: 1
assignee: Steve Macbeth
---
# Production hosting on Mac Studio

Run Manager as an always-on production service on Mac Studio, accessible from all devices via Tailscale + custom domain with HTTPS.

## Design

Architecture:
- Single Bun/Hono process serves API + static frontend on port 3100 (prod)
- Caddy reverse proxy handles HTTPS (:443) via Let's Encrypt DNS-01 challenge with Cloudflare
- launchd for process persistence (3 plists: server, deployer, caddy)
- Git-polling deployer auto-deploys from origin/main every 5 minutes
- Prod checkout at ~/.local/services/manager/
- Logs at ~/Library/Logs/Manager/
- DNS: A record on Cloudflare pointing to Tailscale IP (100.x.x.x), DNS Only mode
- Dev workflow unchanged (~/code/manager/, ports 3000/5173)

Flow: Browser -> HTTPS (:443) -> Caddy -> HTTP (:3100) -> Bun/Hono

Services:
| Service   | Port | Plist                        |
|-----------|------|------------------------------|
| Caddy     | 443  | com.manager.caddy.plist      |
| Bun/Hono  | 3100 | com.manager.server.plist     |
| Deployer  | -    | com.manager.deployer.plist   |

## Acceptance Criteria

- Manager accessible via https://manager.<domain> from any Tailscale device
- Auto-deploys on push to main within 5 minutes
- Survives reboots (launchd RunAtLoad)
- Auto-restarts on crash (launchd KeepAlive)
- Dev instance at ~/code/manager/ unaffected
- Both instances share the same project data and ticket files

