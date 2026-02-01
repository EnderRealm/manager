---
id: m-94da
status: closed
deps: []
links: []
created: 2026-02-01T19:43:24Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-e4de
---
# Add production build pipeline

Add static file serving and production build support to the existing Hono server so a single Bun process can serve both API and frontend in production.

## Design

Files: src/server/index.ts, src/server/lib/logger.ts, vite.config.ts, package.json

1. Static file serving in Hono (src/server/index.ts):
   - When NODE_ENV=production, serve dist/client/ as static files
   - Add SPA fallback: non-API routes that don't match a static file serve index.html
   - Use hono/serve-static or manual middleware

2. Environment-aware port (src/server/index.ts):
   - Read PORT env var, default to 3000
   - Production sets PORT=3100 via launchd plist

3. Environment-aware logging (src/server/lib/logger.ts):
   - Prod: JSON output to ~/Library/Logs/Manager/server.log (no pino-pretty)
   - Dev: unchanged (stdout with pino-pretty + logs/manager.log)
   - Use LOG_DIR env var or NODE_ENV to switch

4. Build script (package.json):
   - Add 'build' script: 'bunx vite build'
   - Add 'start' script: 'NODE_ENV=production bun run src/server/index.ts'

## Acceptance Criteria

- 'bun run build' produces dist/client/ with built frontend
- 'bun run start' serves API on configured port AND static files from dist/client/
- SPA routing works (deep links serve index.html)
- Dev workflow unchanged (vite dev server + API server separately)
- Logs write to ~/Library/Logs/Manager/ when NODE_ENV=production

