---
id: m-fb8a
status: closed
deps: [m-6cc8]
links: []
created: 2026-01-17T23:02:37Z
type: task
priority: 2
assignee: Steve Macbeth
parent: m-2b6b
---
# Git and language detection services

Services to get git status and detect primary language for each project

## Design

Files: src/server/services/git.ts, src/server/services/language.ts

src/server/services/git.ts:
- getGitStatus(projectPath): Promise<GitStatus | null>
  - Run git status --porcelain, git branch --show-current
  - Return { branch, isDirty, ahead, behind } or null if not a repo

src/server/services/language.ts:
- getLanguageStats(projectPath): Promise<LanguageStats>
  - Use linguist-js to analyze directory
  - Return { primary: string, breakdown: Record<string, number> }
  - Cache results (language doesn't change often)

## Acceptance Criteria

- Git status returns correct branch and dirty state
- Language detection returns primary language
- Non-git directories return null gracefully

