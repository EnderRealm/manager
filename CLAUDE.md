# Claude Code Instructions

This project uses `tk` (ticket) for task management. Run `tk help` for commands.

## Ticket Types

- **bug** - Fixing or investigating something that is broken
- **feature** - New functionality (user can do something they couldn't before). UX improvements count as features.
- **task** - Investigation or work that doesn't generate/change code
- **epic** - Large feature requiring multiple implementation steps
- **chore** - Tech debt, refactoring, cleanup

## Ticket Management Rules

- **Never edit ticket files directly** - Always use the `tk` CLI. The CLI is an abstraction layer over the files.
- Use `tk edit <id>` to modify existing tickets (opens in $EDITOR)
- When a command doesn't exist or fails, re-read `tk help` rather than working around the CLI

## Project Overview

<!-- Describe your project here -->

## Development Guidelines

<!-- Add your coding standards, architecture notes, etc. -->
