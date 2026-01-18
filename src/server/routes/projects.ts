import { Hono } from "hono";
import { loadConfig } from "../lib/config.ts";
import { getGitStatus } from "../services/git.ts";
import { getLanguageStats } from "../services/language.ts";
import {
  getTickets,
  getReadyTickets,
  getBlockedTickets,
} from "../services/tk.ts";

export interface TicketCounts {
  inProgress: number;
  ready: number;
  blocked: number;
  open: number;
  closed: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  branch: string | null;
  isDirty: boolean;
  language: string;
  ticketCounts: TicketCounts;
}

const projects = new Hono();

async function getProjectSummary(
  name: string,
  path: string
): Promise<ProjectSummary> {
  const [gitStatus, languageStats, allTickets, readyTickets, blockedTickets] =
    await Promise.all([
      getGitStatus(path),
      getLanguageStats(path),
      getTickets(path),
      getReadyTickets(path),
      getBlockedTickets(path),
    ]);

  const ticketCounts: TicketCounts = {
    inProgress: allTickets.filter((t) => t.status === "in_progress").length,
    ready: readyTickets.length,
    blocked: blockedTickets.length,
    open: allTickets.filter((t) => t.status === "open").length,
    closed: allTickets.filter((t) => t.status === "closed").length,
  };

  return {
    id: name,
    name,
    path,
    branch: gitStatus?.branch ?? null,
    isDirty: gitStatus?.isDirty ?? false,
    language: languageStats.primary,
    ticketCounts,
  };
}

projects.get("/projects", async (c) => {
  const config = loadConfig();

  const summaries = await Promise.all(
    config.projects.map((p) => getProjectSummary(p.name, p.path))
  );

  return c.json(summaries);
});

projects.get("/projects/:id", async (c) => {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === c.req.param("id"));

  if (!project) {
    return c.json({ error: "Project not found" }, 404);
  }

  const summary = await getProjectSummary(project.name, project.path);
  return c.json(summary);
});

export { projects };
