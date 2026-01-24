---
id: m-2dc5
status: closed
deps: []
links: []
created: 2026-01-19T02:42:33Z
type: bug
priority: 3
assignee: Steve Macbeth
---
# Fix TypeScript error: Language color possibly undefined

src/server/routes/projects.ts:143 - languageColors[lang] may be undefined, needs fallback

