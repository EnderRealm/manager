import { spawn } from "node:child_process";
import { logger } from "../lib/logger.ts";

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
  // Run both commands to get full data + titles
  const [queryResult, lsResult] = await Promise.all([
    execTk(projectPath, ["query"]),
    execTk(projectPath, ["ls"]),
  ]);

  // Parse titles from ls output
  const titles = parseListOutput(lsResult.stdout);
  const titleMap = new Map(titles.map((t) => [t.id, t.title]));

  const tickets: Ticket[] = [];
  for (const line of queryResult.stdout.trim().split("\n")) {
    if (!line) continue;
    const raw = JSON.parse(line);
    tickets.push({
      ...raw,
      priority: parseInt(raw.priority, 10) || 2,
      title: titleMap.get(raw.id),
    });
  }

  return tickets;
}

function parseListOutput(stdout: string): { id: string; title: string }[] {
  const results: { id: string; title: string }[] = [];
  for (const line of stdout.trim().split("\n")) {
    if (!line) continue;
    // Format: "m-2b6b   [P2][open] - Project Manager Dashboard"
    const match = line.match(/^(\S+)\s+.*?\s-\s(.+?)(?:\s+<-.*)?$/);
    if (match && match[1] && match[2]) {
      results.push({ id: match[1], title: match[2] });
    }
  }
  return results;
}

export async function getReadyTickets(projectPath: string): Promise<Ticket[]> {
  const { stdout } = await execTk(projectPath, ["ready"]);
  const parsed = parseListOutput(stdout);
  const allTickets = await getTickets(projectPath);

  const results: Ticket[] = [];
  for (const p of parsed) {
    const ticket = allTickets.find((t) => t.id === p.id);
    if (ticket) {
      results.push({ ...ticket, title: p.title });
    }
  }
  return results;
}

export async function getBlockedTickets(projectPath: string): Promise<Ticket[]> {
  const { stdout } = await execTk(projectPath, ["blocked"]);
  const parsed = parseListOutput(stdout);
  const allTickets = await getTickets(projectPath);

  const results: Ticket[] = [];
  for (const p of parsed) {
    const ticket = allTickets.find((t) => t.id === p.id);
    if (ticket) {
      results.push({ ...ticket, title: p.title });
    }
  }
  return results;
}

export async function getClosedTickets(
  projectPath: string,
  limit = 10
): Promise<Ticket[]> {
  const { stdout } = await execTk(projectPath, ["closed", `--limit=${limit}`]);
  const parsed = parseListOutput(stdout);
  const allTickets = await getTickets(projectPath);

  const results: Ticket[] = [];
  for (const p of parsed) {
    const ticket = allTickets.find((t) => t.id === p.id);
    if (ticket) {
      results.push({ ...ticket, title: p.title });
    }
  }
  return results;
}

export async function getTicket(
  projectPath: string,
  id: string
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

    // Extract description (everything after the title)
    let description = "";
    if (titleIndex >= 0 && titleIndex < lines.length - 1) {
      description = lines.slice(titleIndex + 1).join("\n").trim();
    }

    const priority = frontmatter.priority;
    const parent = frontmatter.parent;

    return {
      id: frontmatter.id || id,
      status: frontmatter.status || "open",
      deps: frontmatter.deps ? JSON.parse(frontmatter.deps) : [],
      links: frontmatter.links ? JSON.parse(frontmatter.links) : [],
      created: frontmatter.created || "",
      type: frontmatter.type || "task",
      priority: priority ? parseInt(priority, 10) : 2,
      assignee: frontmatter.assignee,
      parent: parent?.split("#")[0]?.trim(),
      title,
      description: description || undefined,
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
  await execTk(projectPath, ["start", id]);
}

export async function closeTicket(
  projectPath: string,
  id: string
): Promise<void> {
  await execTk(projectPath, ["close", id]);
}

export async function reopenTicket(
  projectPath: string,
  id: string
): Promise<void> {
  await execTk(projectPath, ["reopen", id]);
}
