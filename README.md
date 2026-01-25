# Manager

A developer-focused project management dashboard for monitoring codebases, managing tickets, and running services.

## Features

- **Project Dashboard** - Overview of managed projects with git status, language breakdown, and ticket counts
- **Kanban Board** - Drag-and-drop ticket management with dependency visualization
- **Table View** - Sortable/filterable ticket list
- **Service Manager** - Start/stop/restart tmux-based services with live stats (uptime, memory, CPU)
- **Claude Agent Integration** - Run tickets through Claude Code with permission handling

## Tech Stack

- **Frontend**: React, Vite, TanStack Query
- **Backend**: Hono (Bun)
- **Fonts**: Geist / Geist Mono
- **Services**: tmux session management
- **Tickets**: Markdown files in `.tickets/`, managed via `tk` CLI

## Setup

```bash
bun install
```

### Configuration

Copy the example config to create your own:
```bash
cp config.example.json config.json
```

The config file stores your projects and services. It's gitignored so your local setup won't be committed.

### Environment Variables

Copy the example env file:
```bash
cp .example.env .env
```

Required for Claude Agent integration:
- `ANTHROPIC_API_KEY` - Your Anthropic API key

## Development

```bash
./bootstrap.sh
```

This starts the API server and Vite dev server in tmux sessions that Manager can adopt once running.

- **API Server**: http://localhost:3000
- **Web UI**: http://localhost:5173

To stop:
```bash
tmux kill-session -t mgr-Manager-server
tmux kill-session -t mgr-Manager-web
```

## Ticket System

Tickets are stored as markdown in `.tickets/`. Use the `tk` CLI:

```bash
tk create "Title" -t feature -p 2    # create ticket
tk ls                                 # list all
tk ready                              # unblocked tickets
tk show <id>                          # view details
tk start <id>                         # mark in_progress
tk close <id>                         # close ticket
tk help                               # full command list
```

### Ticket Types

| Type | Use for |
|------|---------|
| `bug` | Fixing something broken |
| `feature` | New functionality or UX improvements |
| `task` | Investigation or non-code work |
| `epic` | Large feature with multiple steps |
| `chore` | Tech debt, refactoring, cleanup |

### Commit Convention

Include ticket ID in commit messages:
```
Fix login validation (m-1234)
```

## Adding Projects

Click "+ add project" on the Projects page:
- **Name**: Identifier (alphanumeric, dashes, underscores)
- **Path**: Absolute path to project root

## Service Management

Services run in tmux with naming: `mgr-<project>-<service-id>`.

Service IDs are auto-generated from names ("API Server" → `api-server`), enabling orphan adoption if you manually start a matching tmux session.

## Docker Development (Optional)

Run the dev environment in Docker for isolation and consistency.

### Setup

1. Create your override file for project mounts:
   ```bash
   cp docker-compose.override.example.yml docker-compose.override.yml
   ```

2. Edit `docker-compose.override.yml` with your projects path:
   ```yaml
   services:
     dev:
       volumes:
         - /path/to/your/projects:/path/to/your/projects
   ```
   Use the same path inside/outside the container so config.json paths work.

3. Start the container:
   ```bash
   docker compose up --build
   ```

### Usage

```bash
docker compose up              # Start
docker compose up -d           # Start in background
docker compose logs -f         # View logs
docker compose down            # Stop
docker compose down -v         # Stop and reset volumes
```

## VS Code (Optional)

Add to `.vscode/launch.json` for quick Docker launching:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Dev Server (Docker)",
      "type": "node-terminal",
      "request": "launch",
      "command": "docker compose up",
      "cwd": "${workspaceFolder}"
    },
    {
      "name": "Dev Server (Docker) - Rebuild",
      "type": "node-terminal",
      "request": "launch",
      "command": "docker compose up --build",
      "cwd": "${workspaceFolder}"
    }
  ]
}
```
