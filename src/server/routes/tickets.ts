import { Hono } from "hono";
import { loadConfig } from "../lib/config.ts";
import { scheduleSyncForProject } from "../services/git-sync.ts";
import {
  getTickets,
  getReadyTickets,
  getBlockedTickets,
  getClosedTickets,
  getTicket,
  createTicket,
  startTicket,
  closeTicket,
  reopenTicket,
  addDependency,
  removeDependency,
  setParent,
  clearParent,
  updatePriority,
  deleteTicket,
  updateTicket,
  type CreateTicketInput,
  type UpdateTicketInput,
} from "../services/tk.ts";

const tickets = new Hono();

function getProjectPath(id: string): string | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === id);
  return project?.path ?? null;
}

tickets.get("/projects/:id/tickets", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const allTickets = await getTickets(projectPath);
  return c.json(allTickets);
});

tickets.get("/projects/:id/tickets/ready", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ready = await getReadyTickets(projectPath);
  return c.json(ready);
});

tickets.get("/projects/:id/tickets/blocked", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const blocked = await getBlockedTickets(projectPath);
  return c.json(blocked);
});

tickets.get("/projects/:id/tickets/closed", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const limit = parseInt(c.req.query("limit") ?? "10", 10);
  const closed = await getClosedTickets(projectPath, limit);
  return c.json(closed);
});

tickets.get("/projects/:id/tickets/:ticketId", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticket = await getTicket(projectPath, c.req.param("ticketId"));
  if (!ticket) {
    return c.json({ error: "Ticket not found" }, 404);
  }
  return c.json(ticket);
});

tickets.post("/projects/:id/tickets", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const body = await c.req.json<CreateTicketInput>();
  if (!body.title) {
    return c.json({ error: "Title is required" }, 400);
  }

  const ticketId = await createTicket(projectPath, body);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket, 201);
});

tickets.patch("/projects/:id/tickets/:ticketId", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  const existing = await getTicket(projectPath, ticketId);
  if (!existing) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  const body = await c.req.json<UpdateTicketInput>();

  await updateTicket(projectPath, ticketId, body);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  const updated = await getTicket(projectPath, ticketId);
  return c.json(updated);
});

tickets.delete("/projects/:id/tickets/:ticketId", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  const existing = await getTicket(projectPath, ticketId);
  if (!existing) {
    return c.json({ error: "Ticket not found" }, 404);
  }

  await deleteTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json({ success: true });
});

tickets.post("/projects/:id/tickets/:ticketId/start", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  await startTicket(projectPath, ticketId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.post("/projects/:id/tickets/:ticketId/close", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  await closeTicket(projectPath, ticketId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.post("/projects/:id/tickets/:ticketId/reopen", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  await reopenTicket(projectPath, ticketId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.post("/projects/:id/tickets/:ticketId/deps", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  const body = await c.req.json<{ blockerId: string }>();
  if (!body.blockerId) {
    return c.json({ error: "blockerId is required" }, 400);
  }

  await addDependency(projectPath, ticketId, body.blockerId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.delete("/projects/:id/tickets/:ticketId/deps/:blockerId", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  const blockerId = c.req.param("blockerId");

  await removeDependency(projectPath, ticketId, blockerId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.post("/projects/:id/tickets/:ticketId/parent", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");
  const body = await c.req.json<{ parentId: string }>();

  if (!body.parentId) {
    return c.json({ error: "parentId is required" }, 400);
  }

  await setParent(projectPath, ticketId, body.parentId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

tickets.delete("/projects/:id/tickets/:ticketId/parent", async (c) => {
  const projectPath = getProjectPath(c.req.param("id"));
  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const ticketId = c.req.param("ticketId");

  await clearParent(projectPath, ticketId);
  const ticket = await getTicket(projectPath, ticketId);
  scheduleSyncForProject(c.req.param("id"), projectPath);
  return c.json(ticket);
});

export { tickets };
