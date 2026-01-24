import { Hono } from "hono";
import { logger } from "./lib/logger.ts";
import { loadConfig } from "./lib/config.ts";
import { tickets } from "./routes/tickets.ts";
import { projects } from "./routes/projects.ts";
import { config as configRoutes } from "./routes/config.ts";
import { events } from "./routes/events.ts";
import { services } from "./routes/services.ts";
import { agents } from "./routes/agents.ts";
import { initialize as initProcessManager } from "./services/process-manager.ts";

const app = new Hono();

const config = loadConfig();
logger.info({ projectCount: config.projects.length }, "Config loaded");

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms,
    },
    "Request"
  );
});

app.onError((err, c) => {
  logger.error({ err: err.message, stack: err.stack }, "Unhandled error");
  return c.json({ error: err.message }, 500);
});

app.get("/api/health", (c) => {
  return c.json({ status: "ok" });
});

app.route("/api", tickets);
app.route("/api", projects);
app.route("/api", configRoutes);
app.route("/api", events);
app.route("/api", services);
app.route("/api", agents);

// Initialize process manager (adopts orphan sessions, starts auto-start services)
initProcessManager().catch((err) => {
  logger.error({ err }, "Failed to initialize process manager");
});

const port = 3000;
logger.info({ port }, "Server starting");

export default {
  port,
  fetch: app.fetch,
};
