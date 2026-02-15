import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { logger } from "../lib/logger.ts";

const LEARNINGS_ROOT = join(homedir(), "code", "learnings");
const SESSIONS_DIR = join(LEARNINGS_ROOT, "sessions");
const PATTERNS_DIR = join(LEARNINGS_ROOT, "patterns");
const ROLLUPS_DIR = join(LEARNINGS_ROOT, "rollups");

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
        .map((s) =>
          s
            .trim()
            .replace(/^['"]|['"]$/g, "")
            .replace(/^\\"|\\"$/g, "")
        )
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

// --- Patterns ---

export interface Pattern {
  id: string;
  status: string;
  description: string;
  evidence: string[];
  suggestedAction: string;
  occurrences: number;
  projects: string[];
  firstSeen: string;
  lastSeen: string;
}

function extractSection(body: string, heading: string): string {
  const regex = new RegExp(`###\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n###\\s|$)`);
  const match = body.match(regex);
  return match ? match[1].trim() : "";
}

function extractBulletList(text: string): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.replace(/^[-*]\s+/, "").trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      results.push(trimmed);
    }
  }
  return results;
}

export function getPatterns(statusFilter?: string): Pattern[] {
  const patterns: Pattern[] = [];

  try {
    const files = readdirSync(PATTERNS_DIR).filter((f) =>
      f.startsWith("ptr-") && f.endsWith(".md")
    );

    for (const file of files) {
      try {
        const content = readFileSync(join(PATTERNS_DIR, file), "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);

        const fm = frontmatter as Record<string, unknown>;
        const pattern: Pattern = {
          id: (fm.id as string) || file.replace(".md", ""),
          status: (fm.status as string) || "observation",
          description: extractSection(body, "Description"),
          evidence: extractBulletList(extractSection(body, "Evidence")),
          suggestedAction: extractSection(body, "Suggested Action"),
          occurrences: (fm.occurrences as number) || 0,
          projects: (fm.projects as string[]) || [],
          firstSeen: (fm.first_seen as string) || "",
          lastSeen: (fm.last_seen as string) || "",
        };

        if (!statusFilter || pattern.status === statusFilter) {
          patterns.push(pattern);
        }
      } catch (err) {
        logger.warn({ file }, "Failed to parse pattern file");
      }
    }
  } catch (err) {
    logger.error({ err }, "Failed to read patterns directory");
  }

  return patterns.sort((a, b) => b.occurrences - a.occurrences);
}

// --- Learnings (rollups + recent session discoveries/decisions) ---

export interface RollupData {
  level: string;
  date: string;
  projects: string[];
  sessions: number;
  messageCount: number;
  toolUses: number;
  filesTouched: number;
  patternsActive: string[];
  body: string;
}

export interface LearningEntry {
  text: string;
  project: string;
  date: string;
}

export interface LearningsResponse {
  rollup: RollupData | null;
  recentDiscoveries: LearningEntry[];
  recentDecisions: LearningEntry[];
}

function loadLatestRollup(period: "week" | "month"): RollupData | null {
  const subdir = period === "week" ? "weekly" : period === "month" ? "monthly" : "daily";
  const dir = join(ROLLUPS_DIR, subdir);

  try {
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const content = readFileSync(join(dir, files[0]), "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);
    const fm = frontmatter as Record<string, unknown>;

    return {
      level: (fm.level as string) || subdir,
      date: (fm.date as string) || files[0].replace(".md", ""),
      projects: (fm.projects as string[]) || [],
      sessions: (fm.sessions as number) || 0,
      messageCount: (fm.message_count as number) || 0,
      toolUses: (fm.tool_uses as number) || 0,
      filesTouched: (fm.files_touched as number) || 0,
      patternsActive: (fm.patterns_active as string[]) || [],
      body,
    };
  } catch (err) {
    logger.warn({ period }, "Failed to load rollup");
    return null;
  }
}

function extractSessionEntries(
  section: string,
  sessions: SessionSummary[],
  limit: number
): LearningEntry[] {
  const entries: LearningEntry[] = [];

  // Sort sessions by date descending
  const sorted = [...sessions].sort(
    (a, b) => (b.frontmatter.date || "").localeCompare(a.frontmatter.date || "")
  );

  for (const session of sorted) {
    if (entries.length >= limit) break;

    const sectionText = extractSection(session.body, section);
    if (!sectionText) continue;

    for (const line of sectionText.split("\n")) {
      if (entries.length >= limit) break;
      const trimmed = line.replace(/^[-*]\s+/, "").trim();
      if (trimmed && trimmed !== "None." && trimmed !== "None") {
        entries.push({
          text: trimmed,
          project: session.frontmatter.project,
          date: session.frontmatter.date,
        });
      }
    }
  }

  return entries;
}

export function getLearnings(
  period: "week" | "month" = "week"
): LearningsResponse {
  const rollup = loadLatestRollup(period);
  const sessions = loadAllSessions();

  return {
    rollup,
    recentDiscoveries: extractSessionEntries("Discoveries", sessions, 10),
    recentDecisions: extractSessionEntries("Decisions", sessions, 10),
  };
}
