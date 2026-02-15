import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { logger } from "../lib/logger.ts";

const LEARNINGS_ROOT = join(homedir(), "code", "learnings");
const SESSIONS_DIR = join(LEARNINGS_ROOT, "sessions");

export interface SessionFrontmatter {
  project: string;
  session_id: string;
  date: string;
  branch: string;
  tickets: string[];
  message_count: number;
  tool_uses: number;
  files_touched: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  processed: boolean;
}

export interface SessionSummary {
  frontmatter: SessionFrontmatter;
  body: string;
}

// Simple YAML frontmatter parser for the consistent session/rollup/pattern format
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, unknown> = {};

  for (const line of yamlStr.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const raw = line.slice(colonIdx + 1).trim();

    // Arrays: [] or [item1, item2]
    if (raw === "[]") {
      frontmatter[key] = [];
      continue;
    }
    if (raw.startsWith("[") && raw.endsWith("]")) {
      frontmatter[key] = raw
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      continue;
    }

    // Booleans
    if (raw === "true") {
      frontmatter[key] = true;
      continue;
    }
    if (raw === "false") {
      frontmatter[key] = false;
      continue;
    }

    // Numbers
    const num = Number(raw);
    if (raw !== "" && !isNaN(num)) {
      frontmatter[key] = num;
      continue;
    }

    // Strings (strip surrounding quotes)
    frontmatter[key] = raw.replace(/^['"]|['"]$/g, "");
  }

  return { frontmatter, body };
}

// Session cache with TTL
let cachedSessions: SessionSummary[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export function loadAllSessions(): SessionSummary[] {
  const now = Date.now();
  if (cachedSessions && now - cacheTimestamp < CACHE_TTL) {
    return cachedSessions;
  }

  const sessions: SessionSummary[] = [];

  try {
    const projectDirs = readdirSync(SESSIONS_DIR);

    for (const projectDir of projectDirs) {
      const projectPath = join(SESSIONS_DIR, projectDir);
      try {
        if (!statSync(projectPath).isDirectory()) continue;
      } catch {
        continue;
      }

      const files = readdirSync(projectPath).filter((f) => f.endsWith(".md"));

      for (const file of files) {
        try {
          const content = readFileSync(join(projectPath, file), "utf-8");
          const { frontmatter, body } = parseFrontmatter(content);
          sessions.push({
            frontmatter: frontmatter as unknown as SessionFrontmatter,
            body,
          });
        } catch (err) {
          logger.warn({ file, projectDir }, "Failed to parse session file");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to read sessions directory");
  }

  cachedSessions = sessions;
  cacheTimestamp = now;
  logger.info({ count: sessions.length }, "Loaded session summaries");

  return sessions;
}

// Activity data types
export interface ProjectActivity {
  name: string;
  tokenCount: number;
  messageCount: number;
  sessions: number;
}

export interface DayActivity {
  date: string;
  projects: ProjectActivity[];
  total: number;
}

export function getActivityData(
  range: "year" | "6months" | "3months" = "year"
): DayActivity[] {
  const sessions = loadAllSessions();

  const daysBack = range === "year" ? 365 : range === "6months" ? 183 : 91;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  // Group sessions by date + project
  const dayMap = new Map<
    string,
    Map<string, { tokenCount: number; messageCount: number; sessions: number }>
  >();

  for (const session of sessions) {
    const { date, project, input_tokens, output_tokens, message_count } =
      session.frontmatter;
    if (!date || date < cutoffStr) continue;

    if (!dayMap.has(date)) dayMap.set(date, new Map());
    const projectMap = dayMap.get(date)!;

    if (!projectMap.has(project)) {
      projectMap.set(project, { tokenCount: 0, messageCount: 0, sessions: 0 });
    }

    const entry = projectMap.get(project)!;
    entry.tokenCount += (input_tokens || 0) + (output_tokens || 0);
    entry.messageCount += message_count || 0;
    entry.sessions += 1;
  }

  // Build complete day list (every day in range, even inactive ones)
  const days: DayActivity[] = [];
  const today = new Date();

  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const projectMap = dayMap.get(dateStr);
    const projects: ProjectActivity[] = [];
    let total = 0;

    if (projectMap) {
      for (const [name, data] of projectMap) {
        projects.push({ name, ...data });
        total += data.tokenCount || data.messageCount;
      }
      projects.sort((a, b) => b.tokenCount - a.tokenCount);
    }

    days.push({ date: dateStr, projects, total });
  }

  return days;
}
