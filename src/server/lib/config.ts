import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger.ts";

export interface ProjectConfig {
  name: string;
  path: string;
}

export interface Config {
  projects: ProjectConfig[];
}

const configPath =
  process.env.CONFIG_PATH || path.join(process.cwd(), "config.json");

export function loadConfig(): Config {
  if (!fs.existsSync(configPath)) {
    logger.warn({ path: configPath }, "Config file not found, using defaults");
    return { projects: [] };
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  const config: Config = JSON.parse(raw);

  for (const project of config.projects) {
    if (!fs.existsSync(project.path)) {
      logger.warn(
        { name: project.name, path: project.path },
        "Project path does not exist"
      );
    }
  }

  return config;
}

export function saveConfig(config: Config): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  logger.info({ projectCount: config.projects.length }, "Config saved");
}

export function addProject(project: ProjectConfig): Config {
  const config = loadConfig();

  if (config.projects.some((p) => p.name === project.name)) {
    throw new Error(`Project "${project.name}" already exists`);
  }

  config.projects.push(project);
  saveConfig(config);
  return config;
}

export function removeProject(name: string): Config {
  const config = loadConfig();
  const index = config.projects.findIndex((p) => p.name === name);

  if (index === -1) {
    throw new Error(`Project "${name}" not found`);
  }

  config.projects.splice(index, 1);
  saveConfig(config);
  return config;
}
