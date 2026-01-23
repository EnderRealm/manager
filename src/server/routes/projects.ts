import { Hono } from "hono";
import { loadConfig } from "../lib/config.ts";
import { getGitStatus } from "../services/git.ts";
import { getLanguageStats } from "../services/language.ts";
import {
  getTickets,
  getReadyTickets,
  getBlockedTickets,
  hasTk,
} from "../services/tk.ts";
import {
  isTmuxAvailable,
  getAllServices,
} from "../services/process-manager.ts";

export interface TicketCounts {
  inProgress: number;
  ready: number;
  blocked: number;
  open: number;
  closed: number;
}

export interface GitInfo {
  branch: string | null;
  isDirty: boolean;
  ahead: number;
  behind: number;
  unstaged: number;
  untracked: number;
}

export interface LanguageInfo {
  primary: string;
  breakdown: { language: string; percentage: number; color: string }[];
}

export type ServiceAggregateStatus =
  | "healthy"    // all services running
  | "degraded"   // some services stopped or unhealthy
  | "crashed"    // any service in crashed state
  | "none"       // no services configured
  | "unknown";   // tmux not available

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  git: GitInfo;
  languages: LanguageInfo;
  hasTk: boolean;
  ticketCounts: TicketCounts;
  serviceStatus: ServiceAggregateStatus;
  serviceDetails?: { id: string; name: string; status: string }[];
}

// Remap commonly misidentified languages
const languageRemap: Record<string, string> = {
  "GCC Machine Description": "Markdown",
  "OpenAPI Specification v2": "JSON",
};

// GitHub-style language colors
const languageColors: Record<string, string> = {
  Markdown: "#083fa1",
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  Ruby: "#701516",
  Shell: "#89e051",
  Batchfile: "#C1F12E",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Lua: "#000080",
  Perl: "#0298c3",
  R: "#198CE7",
  Scala: "#c22d40",
  Haskell: "#5e5086",
  Elixir: "#6e4a7e",
  Clojure: "#db5855",
  OCaml: "#3be133",
  "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  Unknown: "#6e7681",
};

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

  // Calculate language percentages
  const totalBytes = Object.values(languageStats.breakdown).reduce(
    (sum, bytes) => sum + bytes,
    0
  );
  const breakdown = Object.entries(languageStats.breakdown)
    .map(([language, bytes]) => {
      const name = languageRemap[language] ?? language;
      return {
        language: name,
        percentage: totalBytes > 0 ? (bytes / totalBytes) * 100 : 0,
        color: languageColors[name] ?? languageColors.Unknown,
      };
    })
    .filter((lang) => lang.percentage >= 5)
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  // Compute service status
  const services = getAllServices(name);
  let serviceStatus: ServiceAggregateStatus;
  let serviceDetails: { id: string; name: string; status: string }[] | undefined;

  if (services.length === 0) {
    serviceStatus = "none";
  } else if (!isTmuxAvailable()) {
    serviceStatus = "unknown";
  } else {
    const hasCrashed = services.some((s) => s.state.status === "crashed");
    const hasUnhealthy = services.some((s) => s.state.status === "unhealthy");
    const allRunning = services.every((s) => s.state.status === "running");
    const allStopped = services.every((s) => s.state.status === "stopped");

    if (hasCrashed) {
      serviceStatus = "crashed";
    } else if (hasUnhealthy || (!allRunning && !allStopped)) {
      serviceStatus = "degraded";
    } else if (allRunning) {
      serviceStatus = "healthy";
    } else {
      // All stopped - show as none (gray)
      serviceStatus = "none";
    }

    serviceDetails = services.map((s) => ({
      id: s.config.id,
      name: s.config.name,
      status: s.state.status,
    }));
  }

  return {
    id: name,
    name,
    path,
    git: {
      branch: gitStatus?.branch ?? null,
      isDirty: gitStatus?.isDirty ?? false,
      ahead: gitStatus?.ahead ?? 0,
      behind: gitStatus?.behind ?? 0,
      unstaged: gitStatus?.unstaged ?? 0,
      untracked: gitStatus?.untracked ?? 0,
    },
    languages: {
      primary: languageStats.primary,
      breakdown,
    },
    hasTk: hasTk(path),
    ticketCounts,
    serviceStatus,
    serviceDetails,
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
