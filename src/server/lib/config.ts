import fs from "node:fs";
import path from "node:path";
import { logger } from "./logger.ts";

export interface ServiceConfig {
  id: string;
  name: string;
  cmd: string;
  cwd?: string;
  port?: number;
  healthUrl?: string;
  autoStart?: boolean;
  autoRestart?: boolean;
  restartDelay?: number;
  maxRestarts?: number;
  env?: Record<string, string>;
}

export interface ProjectConfig {
  name: string;
  path: string;
  services?: ServiceConfig[];
}

export interface Config {
  projects: ProjectConfig[];
}

const configPath =
  process.env.CONFIG_PATH || path.join(process.cwd(), "config.json");

function validateAndNormalizeServices(
  projectName: string,
  services?: ServiceConfig[]
): ServiceConfig[] {
  if (!services || services.length === 0) {
    return [];
  }

  const seenIds = new Set<string>();
  const normalized: ServiceConfig[] = [];

  for (const service of services) {
    if (!service.id || typeof service.id !== "string") {
      logger.warn({ projectName, service }, "Service missing id, skipping");
      continue;
    }
    if (seenIds.has(service.id)) {
      logger.warn(
        { projectName, serviceId: service.id },
        "Duplicate service id, skipping"
      );
      continue;
    }
    if (!service.cmd || typeof service.cmd !== "string") {
      logger.warn(
        { projectName, serviceId: service.id },
        "Service missing cmd, skipping"
      );
      continue;
    }

    seenIds.add(service.id);
    normalized.push({
      id: service.id,
      name: service.name || service.id,
      cmd: service.cmd,
      cwd: service.cwd || ".",
      port: service.port,
      healthUrl: service.healthUrl,
      autoStart: service.autoStart ?? false,
      autoRestart: service.autoRestart ?? false,
      restartDelay: service.restartDelay ?? 3000,
      maxRestarts: service.maxRestarts ?? 5,
      env: service.env,
    });
  }

  return normalized;
}

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
    project.services = validateAndNormalizeServices(
      project.name,
      project.services
    );
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
