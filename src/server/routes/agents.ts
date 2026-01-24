import { Hono } from "hono";
import { loadConfig } from "../lib/config.ts";
import { getTicket } from "../services/tk.ts";
import {
  startAgentRun,
  respondToPermission,
  getAgentRun,
  getActiveRuns,
  getRunsForTicket,
} from "../services/agent-runner.ts";

const agents = new Hono();

function getProjectPath(id: string): string | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === id);
  return project?.path ?? null;
}

// Start an agent run for a ticket
agents.post("/projects/:id/agents/run", async (c) => {
  const projectId = c.req.param("id");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json<{ ticketId: string; autoMode?: boolean }>();
  const { ticketId, autoMode } = body;

  if (!ticketId) {
    return c.json({ error: "ticketId is required" }, 400);
  }

  // Load the ticket
  const ticket = await getTicket(projectPath, ticketId);
  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  try {
    const runId = await startAgentRun(ticket, projectPath, { autoMode });
    return c.json({ runId }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start agent";
    return c.json({ error: message }, 500);
  }
});

// Get status of a specific run
agents.get("/projects/:id/agents/runs/:runId", (c) => {
  const runId = c.req.param("runId");
  const run = getAgentRun(runId);

  if (!run) {
    return c.json({ error: "Run not found" }, 404);
  }

  return c.json({
    id: run.id,
    ticketId: run.ticketId,
    status: run.status,
    sessionId: run.sessionId,
    pendingPermission: run.pendingPermission
      ? {
          toolName: run.pendingPermission.toolName,
          input: run.pendingPermission.input,
          toolUseId: run.pendingPermission.toolUseId,
        }
      : undefined,
    result: run.result,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    messageCount: run.messages.length,
  });
});

// Get all active runs
agents.get("/projects/:id/agents/runs", (c) => {
  const runs = getActiveRuns();
  return c.json({
    runs: runs.map((run) => ({
      id: run.id,
      ticketId: run.ticketId,
      status: run.status,
      startedAt: run.startedAt,
    })),
  });
});

// Get runs for a specific ticket
agents.get("/projects/:id/agents/ticket/:ticketId/runs", (c) => {
  const ticketId = c.req.param("ticketId");
  const runs = getRunsForTicket(ticketId);

  return c.json({
    runs: runs.map((run) => ({
      id: run.id,
      status: run.status,
      result: run.result,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
    })),
  });
});

// Respond to a permission request
agents.post("/projects/:id/agents/runs/:runId/permission", async (c) => {
  const runId = c.req.param("runId");
  const body = await c.req.json<{ allow: boolean; message?: string }>();

  try {
    respondToPermission(runId, body.allow, body.message);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to respond to permission";
    return c.json({ error: message }, 400);
  }
});

// Get messages for a run (for streaming/polling)
agents.get("/projects/:id/agents/runs/:runId/messages", (c) => {
  const runId = c.req.param("runId");
  const afterIndex = parseInt(c.req.query("after") || "0", 10);

  const run = getAgentRun(runId);
  if (!run) {
    return c.json({ error: "Run not found" }, 404);
  }

  // Return messages after the specified index
  const messages = run.messages.slice(afterIndex);

  return c.json({
    messages,
    nextIndex: run.messages.length,
    status: run.status,
    result: run.result,
  });
});

export { agents };
