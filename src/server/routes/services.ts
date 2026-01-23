import { Hono } from "hono";
import { loadConfig } from "../lib/config.ts";
import {
  isTmuxAvailable,
  startService,
  stopService,
  restartService,
  getAllServices,
} from "../services/process-manager.ts";
import { captureLogs, getSessionName } from "../services/tmux.ts";

const services = new Hono();

function getProjectPath(id: string): string | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === id);
  return project?.path ?? null;
}

// List services with current status
services.get("/projects/:id/services", (c) => {
  const projectId = c.req.param("id");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const tmuxAvailable = isTmuxAvailable();
  const serviceList = getAllServices(projectId);

  return c.json({
    tmuxAvailable,
    services: serviceList.map((s) => ({
      id: s.config.id,
      name: s.config.name,
      cmd: s.config.cmd,
      type: s.config.type || "service",
      port: s.config.port,
      healthUrl: s.config.healthUrl,
      autoStart: s.config.autoStart,
      autoRestart: s.config.autoRestart,
      status: s.state.status,
      lastHealthCheck: s.state.lastHealthCheck,
      lastError: s.state.lastError,
      sessionName: getSessionName(projectId, s.config.id),
    })),
  });
});

// Start a service
services.post("/projects/:id/services/:sid/start", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (!isTmuxAvailable()) {
    return c.json({ error: "tmux not available" }, 503);
  }

  try {
    await startService(projectId, serviceId);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start service";
    return c.json({ error: message }, 400);
  }
});

// Stop a service
services.post("/projects/:id/services/:sid/stop", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (!isTmuxAvailable()) {
    return c.json({ error: "tmux not available" }, 503);
  }

  try {
    await stopService(projectId, serviceId);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stop service";
    return c.json({ error: message }, 400);
  }
});

// Restart a service
services.post("/projects/:id/services/:sid/restart", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (!isTmuxAvailable()) {
    return c.json({ error: "tmux not available" }, 503);
  }

  try {
    await restartService(projectId, serviceId);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restart service";
    return c.json({ error: message }, 400);
  }
});

// Get service logs
services.get("/projects/:id/services/:sid/logs", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  if (!isTmuxAvailable()) {
    return c.json({ error: "tmux not available" }, 503);
  }

  const lines = parseInt(c.req.query("lines") ?? "200", 10);
  const logs = await captureLogs(projectId, serviceId, lines);

  return c.json({
    logs,
    sessionName: getSessionName(projectId, serviceId),
  });
});

export { services };
