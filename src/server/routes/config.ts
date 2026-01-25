import { Hono } from "hono";
import fs from "node:fs";
import {
  loadConfig,
  addProject,
  removeProject,
  loadPreferences,
  savePreferences,
  type ProjectConfig,
  type Preferences,
} from "../lib/config.ts";

const config = new Hono();

config.get("/config/projects", (c) => {
  const cfg = loadConfig();
  return c.json(cfg.projects);
});

config.post("/config/projects", async (c) => {
  const body = await c.req.json<ProjectConfig>();

  if (!body.name || !body.path) {
    return c.json({ error: "Name and path are required" }, 400);
  }

  if (!fs.existsSync(body.path)) {
    return c.json({ error: "Path does not exist" }, 400);
  }

  try {
    const cfg = addProject({ name: body.name, path: body.path });
    return c.json(cfg.projects, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add project";
    return c.json({ error: message }, 400);
  }
});

config.delete("/config/projects/:name", (c) => {
  const name = c.req.param("name");

  try {
    const cfg = removeProject(name);
    return c.json(cfg.projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove project";
    return c.json({ error: message }, 404);
  }
});

config.get("/preferences", (c) => {
  const preferences = loadPreferences();
  return c.json(preferences);
});

config.put("/preferences", async (c) => {
  try {
    const body = await c.req.json<Preferences>();
    savePreferences(body);
    return c.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save preferences";
    return c.json({ error: message }, 400);
  }
});

export { config };
