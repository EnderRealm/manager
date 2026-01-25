import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "../lib/logger.ts";

export function hasTk(projectPath: string): boolean {
  return existsSync(join(projectPath, ".tickets"));
}

export interface Ticket {
  id: string;
  status: string;
  deps: string[];
  links: string[];
  created: string;
  type: string;
  priority: number;
  assignee?: string;
  parent?: string;
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  children?: string[];
  rawContent?: string;
}

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execTk(
  projectPath: string,
  args: string[]
): Promise<ExecResult> {
  const start = Date.now();
  const cmd = ["tk", ...args].join(" ");

  return new Promise((resolve, reject) => {
    const proc = spawn("tk", args, {
      cwd: projectPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      logger.error({ cmd, projectPath, err: err.message }, "tk spawn failed");
      reject(err);
    });

    proc.on("close", (exitCode) => {
      const ms = Date.now() - start;
      const code = exitCode ?? 0;

      logger.info({ cmd, projectPath, exitCode: code, ms }, "tk executed");

      if (code !== 0) {
        const err = new Error(`tk failed: ${stderr.trim() || "exit " + code}`);
        logger.error({ cmd, projectPath, stderr, exitCode: code }, "tk error");
        reject(err);
        return;
      }

      resolve({ stdout, stderr, exitCode: code });
    });
  });
}

export async function getTickets(projectPath: string): Promise<Ticket[]> {
  try {
    const { stdout } = await execTk(projectPath, ["query"]);

    const tickets: Ticket[] = [];
    for (const line of stdout.trim().split("\n")) {
      if (!line) continue;
      const raw = JSON.parse(line);
      tickets.push({
        ...raw,
        priority: raw.priority !== undefined ? Number(raw.priority) : 2,
      });
    }

    return tickets;
  } catch {
    // tk not initialized in this project
    return [];
  }
}

function parseTicketIds(stdout: string): string[] {
  const ids: string[] = [];
  for (const line of stdout.trim().split("\n")) {
    const match = line.match(/^(\S+-[a-f0-9]+)/);
    if (match && match[1]) {
      ids.push(match[1]);
    }
  }
  return ids;
}

export async function getReadyTickets(projectPath: string): Promise<Ticket[]> {
  try {
    const { stdout } = await execTk(projectPath, ["ready"]);
    const ids = parseTicketIds(stdout);
    const allTickets = await getTickets(projectPath);
    return allTickets.filter((t) => ids.includes(t.id));
  } catch {
    return [];
  }
}

export async function getBlockedTickets(projectPath: string): Promise<Ticket[]> {
  try {
    const { stdout } = await execTk(projectPath, ["blocked"]);
    const ids = parseTicketIds(stdout);
    const allTickets = await getTickets(projectPath);
    return allTickets.filter((t) => ids.includes(t.id));
  } catch {
    return [];
  }
}

export async function getClosedTickets(
  projectPath: string,
  limit = 10
): Promise<Ticket[]> {
  try {
    const { stdout } = await execTk(projectPath, ["closed", `--limit=${limit}`]);
    const ids = parseTicketIds(stdout);
    const allTickets = await getTickets(projectPath);
    return allTickets.filter((t) => ids.includes(t.id));
  } catch {
    return [];
  }
}

function parseArrayField(value: string | undefined): string[] {
  if (!value) return [];
  // Handle both JSON format ["a", "b"] and tk format [a, b]
  try {
    return JSON.parse(value);
  } catch {
    // Parse tk format: [m-a7da, m-b2c3] -> ["m-a7da", "m-b2c3"]
    const match = value.match(/^\[(.*)\]$/);
    if (match && match[1]) {
      return match[1].split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }
}

interface ParsedBody {
  description: string;
  design?: string;
  acceptanceCriteria?: string;
  children?: string[];
}

function parseTicketBody(body: string): ParsedBody {
  const sections: Record<string, string> = {};
  let currentSection = "description";
  const lines: string[] = [];

  for (const line of body.split("\n")) {
    const sectionMatch = line.match(/^##\s+(.+)$/);
    if (sectionMatch) {
      sections[currentSection] = lines.join("\n").trim();
      lines.length = 0;
      currentSection = sectionMatch[1]!.toLowerCase().replace(/\s+/g, "_");
    } else {
      lines.push(line);
    }
  }
  sections[currentSection] = lines.join("\n").trim();

  // Parse children from the Children section (ticket IDs like m-xxxx)
  let children: string[] | undefined;
  if (sections.children) {
    children = sections.children.match(/m-[a-f0-9]{4}/g) ?? undefined;
  }

  return {
    description: sections.description || "",
    design: sections.design || undefined,
    acceptanceCriteria: sections.acceptance_criteria || undefined,
    children,
  };
}

export async function getTicket(
  projectPath: string,
  id: string,
  allTickets?: Ticket[]
): Promise<Ticket | null> {
  try {
    const { stdout } = await execTk(projectPath, ["show", id]);
    // Parse frontmatter, title, and body from tk show output
    const lines = stdout.split("\n");
    let inFrontmatter = false;
    const frontmatter: Record<string, string> = {};
    let title = "";
    let titleIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line === "---") {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (inFrontmatter) {
        const match = line.match(/^(\w+):\s*(.*)$/);
        if (match && match[1]) {
          frontmatter[match[1]] = match[2] ?? "";
        }
      } else if (line.startsWith("# ")) {
        title = line.slice(2).trim();
        titleIndex = i;
        break;
      }
    }

    // Extract body (everything after the title)
    let body = "";
    if (titleIndex >= 0 && titleIndex < lines.length - 1) {
      body = lines.slice(titleIndex + 1).join("\n").trim();
    }

    const parsed = parseTicketBody(body);
    const priority = frontmatter.priority;
    const parent = frontmatter.parent;
    const ticketId = frontmatter.id || id;

    // Find children (tickets whose parent is this ticket)
    let children: string[] | undefined;
    const tickets = allTickets ?? await getTickets(projectPath);
    const childTickets = tickets.filter((t) => t.parent === ticketId);
    if (childTickets.length > 0) {
      children = childTickets.map((t) => t.id);
    }

    return {
      id: ticketId,
      status: frontmatter.status || "open",
      deps: parseArrayField(frontmatter.deps),
      links: parseArrayField(frontmatter.links),
      created: frontmatter.created || "",
      type: frontmatter.type || "task",
      priority: priority !== undefined ? Number(priority) : 2,
      assignee: frontmatter.assignee,
      parent: parent?.split("#")[0]?.trim(),
      title,
      description: parsed.description || undefined,
      design: parsed.design,
      acceptanceCriteria: parsed.acceptanceCriteria,
      children,
      rawContent: stdout,
    };
  } catch {
    return null;
  }
}

export interface CreateTicketInput {
  title: string;
  type?: string;
  priority?: number;
  description?: string;
  assignee?: string;
  parent?: string;
}

export async function createTicket(
  projectPath: string,
  input: CreateTicketInput
): Promise<string> {
  const args = ["create", input.title];

  if (input.type) {
    args.push("--type", input.type);
  }
  if (input.priority !== undefined) {
    args.push("--priority", String(input.priority));
  }
  if (input.description) {
    args.push("--description", input.description);
  }
  if (input.assignee) {
    args.push("--assignee", input.assignee);
  }
  if (input.parent) {
    args.push("--parent", input.parent);
  }

  const { stdout } = await execTk(projectPath, args);
  return stdout.trim();
}

export async function startTicket(
  projectPath: string,
  id: string
): Promise<void> {
  await execTk(projectPath, ["edit", id, "--status", "in_progress"]);
}

export async function closeTicket(
  projectPath: string,
  id: string
): Promise<void> {
  await execTk(projectPath, ["edit", id, "--status", "closed"]);
}

export async function reopenTicket(
  projectPath: string,
  id: string
): Promise<void> {
  await execTk(projectPath, ["edit", id, "--status", "open"]);
}

export async function addDependency(
  projectPath: string,
  childId: string,
  parentId: string
): Promise<void> {
  // tk dep <child> <parent> makes child depend on parent
  await execTk(projectPath, ["dep", childId, parentId]);
}

export async function removeDependency(
  projectPath: string,
  childId: string,
  parentId: string
): Promise<void> {
  // tk undep <child> <parent> removes the dependency
  await execTk(projectPath, ["undep", childId, parentId]);
}

export async function setParent(
  projectPath: string,
  ticketId: string,
  parentId: string
): Promise<void> {
  await execTk(projectPath, ["edit", ticketId, "--parent", parentId]);
}

export async function clearParent(
  projectPath: string,
  ticketId: string
): Promise<void> {
  // tk edit --parent "" skips empty values, so manipulate file directly
  const ticketPath = join(projectPath, ".tickets", `${ticketId}.md`);

  if (!existsSync(ticketPath)) {
    throw new Error(`Ticket not found: ${ticketId}`);
  }

  const content = readFileSync(ticketPath, "utf-8");
  const lines = content.split("\n");
  const filtered: string[] = [];
  let inFrontmatter = false;

  for (const line of lines) {
    if (line === "---") {
      inFrontmatter = !inFrontmatter;
      filtered.push(line);
      continue;
    }

    // Skip parent line in frontmatter
    if (inFrontmatter && line.match(/^parent:\s*/)) {
      continue;
    }

    filtered.push(line);
  }

  writeFileSync(ticketPath, filtered.join("\n"));
}

export async function updatePriority(
  projectPath: string,
  ticketId: string,
  priority: number
): Promise<void> {
  await execTk(projectPath, ["edit", ticketId, "--priority", String(priority)]);
}

export async function deleteTicket(
  projectPath: string,
  ticketId: string
): Promise<void> {
  await execTk(projectPath, ["delete", ticketId]);
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  status?: string;
  type?: string;
  priority?: number;
  assignee?: string;
  parent?: string;
}

export async function updateTicket(
  projectPath: string,
  ticketId: string,
  input: UpdateTicketInput
): Promise<void> {
  const args = ["edit", ticketId];

  if (input.title) {
    args.push("--title", input.title);
  }
  if (input.description !== undefined) {
    args.push("--description", input.description);
  }
  if (input.design !== undefined) {
    args.push("--design", input.design);
  }
  if (input.acceptanceCriteria !== undefined) {
    args.push("--acceptance", input.acceptanceCriteria);
  }
  if (input.status) {
    args.push("--status", input.status);
  }
  if (input.type) {
    args.push("--type", input.type);
  }
  if (input.priority !== undefined) {
    args.push("--priority", String(input.priority));
  }
  if (input.assignee !== undefined) {
    args.push("--assignee", input.assignee);
  }
  if (input.parent !== undefined) {
    args.push("--parent", input.parent);
  }

  await execTk(projectPath, args);
}
