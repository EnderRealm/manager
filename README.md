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

### Learnings Repo

The learnings pipeline scripts summarize Claude Code sessions, detect patterns, and generate rollups — all stored in a separate git repo. Clone it before running any of the pipeline scripts:

```bash
git clone <your-learnings-repo-url> ~/code/learnings
```

To use a different path, set `LEARNINGS_REPO`:

```bash
export LEARNINGS_REPO=/path/to/your/learnings
```

### Nightly Pipelines

Two launchd services handle nightly processing:

| Pipeline | Script | Schedule | Install on |
|----------|--------|----------|------------|
| **Session** | `session-pipeline.sh` | 2 AM | All machines |
| **Analysis** | `analysis-pipeline.sh` | 3 AM | Mac Studio only |

The **session pipeline** catches up on unsummarized Claude Code sessions from the local machine and extracts actionable items. It's idempotent — safe to run on every machine.

The **analysis pipeline** runs pattern detection and rollup generation across all session data. It makes Claude API calls on every run, so it should only run on one machine.

```bash
# Inspect generated plists
scripts/install-nightly.sh

# Mac Studio: install both pipelines
scripts/install-nightly.sh --install

# Laptop: install session pipeline only
scripts/install-nightly.sh --install-sessions

# Uninstall all
scripts/install-nightly.sh --uninstall
```

Logs:
- `~/Library/Logs/Manager/session-pipeline.log`
- `~/Library/Logs/Manager/analysis-pipeline.log`

Prerequisites: `claude` and `tk` on PATH, `~/code/learnings` repo cloned.

> **Migration:** If you have the old `com.smacbeth.learnings-nightly` label loaded, unload it:
> `launchctl bootout gui/$(id -u)/com.smacbeth.learnings-nightly`

### Environment Variables

Copy the example env file:
```bash
cp .example.env .env
```

Required for Claude Agent integration:
- `ANTHROPIC_API_KEY` - Your Anthropic API key

Optional:
- `LEARNINGS_REPO` - Path to the learnings git repo (default: `~/code/learnings`)

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
