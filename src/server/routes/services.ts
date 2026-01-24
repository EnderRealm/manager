import { Hono } from "hono";
import {
  loadConfig,
  addService,
  updateService,
  removeService,
  type ServiceInput,
} from "../lib/config.ts";
import {
  isTmuxAvailable,
  startService,
  stopService,
  restartService,
  getAllServices,
  getServiceState,
  reloadProjectServices,
} from "../services/process-manager.ts";
import { captureLogs, getSessionName, getSessionProcessStats } from "../services/tmux.ts";

const services = new Hono();

function getProjectPath(id: string): string | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === id);
  return project?.path ?? null;
}

// List services with current status
services.get("/projects/:id/services", async (c) => {
  const projectId = c.req.param("id");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const tmuxAvailable = isTmuxAvailable();
  const serviceList = getAllServices(projectId);

  // Gather process stats for running services
  const servicesWithStats = await Promise.all(
    serviceList.map(async (s) => {
      const isRunning = s.state.status === "running" || s.state.status === "starting";
      const stats = isRunning ? await getSessionProcessStats(projectId, s.config.id) : null;

      return {
        id: s.config.id,
        name: s.config.name,
        cmd: s.config.cmd,
        type: s.config.type || "service",
        cwd: s.config.cwd,
        port: s.config.port,
        healthUrl: s.config.healthUrl,
        autoStart: s.config.autoStart,
        autoRestart: s.config.autoRestart,
        restartDelay: s.config.restartDelay,
        maxRestarts: s.config.maxRestarts,
        env: s.config.env,
        status: s.state.status,
        lastHealthCheck: s.state.lastHealthCheck,
        lastError: s.state.lastError,
        sessionName: getSessionName(projectId, s.config.id),
        stats,
      };
    })
  );

  return c.json({
    tmuxAvailable,
    services: servicesWithStats,
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

// Create a new service
services.post("/projects/:id/services", async (c) => {
  const projectId = c.req.param("id");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  try {
    const body = await c.req.json<ServiceInput>();
    addService(projectId, body);
    reloadProjectServices(projectId);
    return c.json({ success: true }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create service";
    return c.json({ error: message }, 400);
  }
});

// Update a service
services.put("/projects/:id/services/:sid", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  try {
    const body = await c.req.json<Partial<Omit<ServiceInput, "id">>>();
    updateService(projectId, serviceId, body);
    reloadProjectServices(projectId);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update service";
    return c.json({ error: message }, 400);
  }
});

// Delete a service
services.delete("/projects/:id/services/:sid", async (c) => {
  const projectId = c.req.param("id");
  const serviceId = c.req.param("sid");
  const projectPath = getProjectPath(projectId);

  if (!projectPath) {
    return c.json({ error: "Project not found" }, 404);
  }

  const state = getServiceState(projectId, serviceId);
  if (state && state.status !== "stopped" && state.status !== "crashed") {
    return c.json({ error: "Cannot delete a running service" }, 400);
  }

  try {
    removeService(projectId, serviceId);
    reloadProjectServices(projectId);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete service";
    return c.json({ error: message }, 400);
  }
});

export { services };
