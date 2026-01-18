---
id: m-6cc8
status: closed
deps: [m-763f]
links: []
created: 2026-01-17T23:01:51Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-2b6b
---
# Backend foundation - Hono server, logger, config

Set up Hono server with pino logging and config file loading

## Design

Files: src/server/index.ts, src/server/lib/logger.ts, src/server/lib/config.ts, config.json

src/server/lib/logger.ts:
- Export pino instance configured for JSON output
- Log to ./logs/manager.log and stdout
- Include timestamp, level, message

src/server/lib/config.ts:
- Load config.json from project root
- Type: { projects: Array<{ name: string, path: string }> }
- Validate paths exist on load, warn if not

src/server/index.ts:
- Hono app with JSON middleware
- Request logging middleware
- Health check endpoint GET /api/health
- Error handler that logs and returns JSON errors
- Listen on port 3000

config.json:
- Empty projects array as starting point

## Acceptance Criteria

- Server starts on port 3000
- GET /api/health returns { status: 'ok' }
- Requests logged to logs/manager.log
- Config loads without error

