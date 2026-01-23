import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { loadConfig } from "../lib/config.ts";
import { watchProject, onTicketChange, type TicketChangeEvent } from "../services/watcher.ts";
import { onStatusChange, type ServiceStatusEvent } from "../services/process-manager.ts";
import { logger } from "../lib/logger.ts";

const events = new Hono();

function getProjectPath(id: string): string | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === id);
  return project?.path ?? null;
}

events.get("/projects/:id/events", async (c) => {
  const projectId = c.req.param("id");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  watchProject(projectId, projectPath);

  return streamSSE(c, async (stream) => {
    logger.info({ projectId }, "SSE client connected");

    let closed = false;

    const unsubscribeTickets = onTicketChange((event: TicketChangeEvent) => {
      if (closed) return;
      if (event.projectId !== projectId) return;

      stream.writeSSE({
        event: "ticket-change",
        data: JSON.stringify(event),
      });
    });

    const unsubscribeServices = onStatusChange((event: ServiceStatusEvent) => {
      if (closed) return;
      if (event.projectId !== projectId) return;

      stream.writeSSE({
        event: "service-status",
        data: JSON.stringify(event),
      });
    });

    stream.onAbort(() => {
      closed = true;
      unsubscribeTickets();
      unsubscribeServices();
      logger.info({ projectId }, "SSE client disconnected");
    });

    // Send initial ping
    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ projectId, timestamp: Date.now() }),
    });

    // Keep connection alive with periodic pings
    while (!closed) {
      await stream.sleep(30000);
      if (!closed) {
        await stream.writeSSE({
          event: "ping",
          data: JSON.stringify({ timestamp: Date.now() }),
        });
      }
    }
  });
});

export { events };
