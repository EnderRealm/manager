import { join } from "node:path";
import { EventEmitter } from "node:events";
import { logger } from "../lib/logger.ts";
import { loadConfig, type ServiceConfig } from "../lib/config.ts";
import {
  checkTmuxInstalled,
  sessionExists,
  createSession,
  killSession,
  listSessions,
  parseSessionName,
  getSessionName,
} from "./tmux.ts";

export type ServiceStatus =
  | "stopped"
  | "starting"
  | "running"
  | "unhealthy"
  | "crashed"
  | "restarting";

export interface ServiceState {
  status: ServiceStatus;
  lastHealthCheck?: number;
  lastError?: string;
  restartCount: number;
  restartWindowStart: number;
}

export interface ServiceStatusEvent {
  projectId: string;
  serviceId: string;
  status: ServiceStatus;
  error?: string;
}

// Map<projectId, Map<serviceId, ServiceState>>
const serviceStates = new Map<string, Map<string, ServiceState>>();
const emitter = new EventEmitter();

let tmuxAvailable = false;
let healthCheckInterval: NodeJS.Timeout | null = null;

const HEALTH_CHECK_INTERVAL = 5000;
const RESTART_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getState(projectId: string, serviceId: string): ServiceState {
  let projectStates = serviceStates.get(projectId);
  if (!projectStates) {
    projectStates = new Map();
    serviceStates.set(projectId, projectStates);
  }

  let state = projectStates.get(serviceId);
  if (!state) {
    state = {
      status: "stopped",
      restartCount: 0,
      restartWindowStart: Date.now(),
    };
    projectStates.set(serviceId, state);
  }

  return state;
}

function setState(
  projectId: string,
  serviceId: string,
  updates: Partial<ServiceState>
): ServiceState {
  const state = getState(projectId, serviceId);
  Object.assign(state, updates);

  // Emit status change event
  if (updates.status) {
    const event: ServiceStatusEvent = {
      projectId,
      serviceId,
      status: state.status,
      error: state.lastError,
    };
    emitter.emit("status-change", event);
    logger.info({ projectId, serviceId, status: state.status }, "Service status changed");
  }

  return state;
}

function getServiceConfig(projectId: string, serviceId: string): ServiceConfig | null {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === projectId);
  if (!project?.services) return null;
  return project.services.find((s) => s.id === serviceId) || null;
}

async function checkHealth(projectId: string, serviceId: string): Promise<boolean> {
  const config = getServiceConfig(projectId, serviceId);
  if (!config) return false;

  // First check if tmux session exists
  const exists = await sessionExists(projectId, serviceId);
  if (!exists) return false;

  // If healthUrl configured, do HTTP check
  if (config.healthUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(config.healthUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  // If port configured, check if port is listening
  if (config.port) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);

      await fetch(`http://localhost:${config.port}`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return true;
    } catch (err: unknown) {
      // Connection refused means port isn't listening
      // But timeout or other error might mean it's starting up
      if (err instanceof Error && err.name === "AbortError") {
        return true; // Timeout means something is there, just slow
      }
      return false;
    }
  }

  // No health check configured, session existing is enough
  return true;
}

async function runHealthChecks(): Promise<void> {
  const config = loadConfig();

  for (const project of config.projects) {
    if (!project.services) continue;

    for (const service of project.services) {
      const state = getState(project.name, service.id);

      // Check if a "stopped" service has an orphan session we should adopt
      if (state.status === "stopped") {
        const sessionAlive = await sessionExists(project.name, service.id);
        if (sessionAlive) {
          logger.info({ projectId: project.name, serviceId: service.id }, "Adopting late orphan session");
          setState(project.name, service.id, {
            status: "running",
            restartCount: 0,
            restartWindowStart: Date.now(),
          });
        }
        continue;
      }

      const sessionAlive = await sessionExists(project.name, service.id);
      const now = Date.now();

      if (!sessionAlive) {
        // Session died
        if (state.status === "running" || state.status === "starting" || state.status === "unhealthy") {
          // Check if we should auto-restart
          if (service.autoRestart) {
            // Reset restart window if needed
            if (now - state.restartWindowStart > RESTART_WINDOW_MS) {
              state.restartCount = 0;
              state.restartWindowStart = now;
            }

            if (state.restartCount < (service.maxRestarts ?? 5)) {
              setState(project.name, service.id, {
                status: "restarting",
                lastError: "Process died, restarting...",
              });

              // Schedule restart after delay
              setTimeout(async () => {
                try {
                  await doStartService(project.name, service.id);
                  state.restartCount++;
                } catch (err) {
                  setState(project.name, service.id, {
                    status: "crashed",
                    lastError: err instanceof Error ? err.message : "Restart failed",
                  });
                }
              }, service.restartDelay ?? 3000);
            } else {
              setState(project.name, service.id, {
                status: "crashed",
                lastError: `Exceeded max restarts (${service.maxRestarts ?? 5})`,
              });
            }
          } else {
            setState(project.name, service.id, {
              status: "stopped",
              lastError: "Process exited",
            });
          }
        }
        continue;
      }

      // Session is alive, check health
      const healthy = await checkHealth(project.name, service.id);
      setState(project.name, service.id, {
        status: healthy ? "running" : "unhealthy",
        lastHealthCheck: now,
        lastError: healthy ? undefined : "Health check failed",
      });
    }
  }
}

async function adoptOrphanSessions(): Promise<void> {
  const sessions = await listSessions();
  const config = loadConfig();

  for (const sessionName of sessions) {
    const parsed = parseSessionName(sessionName);
    if (!parsed) continue;

    const { projectId, serviceId } = parsed;

    // Check if this is a configured service
    const serviceConfig = getServiceConfig(projectId, serviceId);
    if (!serviceConfig) {
      logger.warn({ sessionName }, "Found orphan session with no config");
      continue;
    }

    // Adopt it
    logger.info({ projectId, serviceId }, "Adopting existing session");
    setState(projectId, serviceId, {
      status: "running",
      restartCount: 0,
      restartWindowStart: Date.now(),
    });
  }
}

async function startAutoStartServices(): Promise<void> {
  const config = loadConfig();

  for (const project of config.projects) {
    if (!project.services) continue;

    for (const service of project.services) {
      if (!service.autoStart) continue;

      const state = getState(project.name, service.id);
      if (state.status !== "stopped") continue; // Already running (adopted)

      logger.info({ projectId: project.name, serviceId: service.id }, "Auto-starting service");
      try {
        await doStartService(project.name, service.id);
      } catch (err) {
        logger.error(
          { projectId: project.name, serviceId: service.id, err },
          "Failed to auto-start service"
        );
      }
    }
  }
}

async function doStartService(projectId: string, serviceId: string): Promise<void> {
  const config = getServiceConfig(projectId, serviceId);
  if (!config) {
    throw new Error(`Service ${serviceId} not found in project ${projectId}`);
  }

  const projectConfig = loadConfig().projects.find((p) => p.name === projectId);
  if (!projectConfig) {
    throw new Error(`Project ${projectId} not found`);
  }

  const cwd = join(projectConfig.path, config.cwd || ".");

  setState(projectId, serviceId, { status: "starting" });

  await createSession(projectId, serviceId, cwd, config.cmd, config.env);

  // Give it a moment to start
  await new Promise((r) => setTimeout(r, 500));

  const healthy = await checkHealth(projectId, serviceId);
  setState(projectId, serviceId, {
    status: healthy ? "running" : "starting",
    lastHealthCheck: Date.now(),
  });
}

// Public API

export async function initialize(): Promise<void> {
  tmuxAvailable = await checkTmuxInstalled();

  if (!tmuxAvailable) {
    logger.warn("tmux not installed, service management disabled");
    return;
  }

  logger.info("Initializing process manager");

  // Adopt any existing sessions
  await adoptOrphanSessions();

  // Start auto-start services
  await startAutoStartServices();

  // Start health check loop
  healthCheckInterval = setInterval(runHealthChecks, HEALTH_CHECK_INTERVAL);
  logger.info("Health check loop started");
}

export function shutdown(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}

export function isTmuxAvailable(): boolean {
  return tmuxAvailable;
}

export async function startService(projectId: string, serviceId: string): Promise<void> {
  if (!tmuxAvailable) {
    throw new Error("tmux not available");
  }

  const state = getState(projectId, serviceId);
  if (state.status === "running" || state.status === "starting") {
    throw new Error("Service already running");
  }

  // Reset crash state if manually starting
  if (state.status === "crashed") {
    state.restartCount = 0;
    state.restartWindowStart = Date.now();
  }

  await doStartService(projectId, serviceId);
}

export async function stopService(projectId: string, serviceId: string): Promise<void> {
  if (!tmuxAvailable) {
    throw new Error("tmux not available");
  }

  const state = getState(projectId, serviceId);
  if (state.status === "stopped") {
    return;
  }

  await killSession(projectId, serviceId);
  setState(projectId, serviceId, {
    status: "stopped",
    lastError: undefined,
  });
}

export async function restartService(projectId: string, serviceId: string): Promise<void> {
  await stopService(projectId, serviceId);
  await new Promise((r) => setTimeout(r, 500));
  await startService(projectId, serviceId);
}

export function getServiceStatus(projectId: string, serviceId: string): ServiceState {
  return getState(projectId, serviceId);
}

export function getAllServices(projectId: string): Array<{
  config: ServiceConfig;
  state: ServiceState;
}> {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === projectId);
  if (!project?.services) return [];

  return project.services.map((serviceConfig) => ({
    config: serviceConfig,
    state: getState(projectId, serviceConfig.id),
  }));
}

export function onStatusChange(handler: (event: ServiceStatusEvent) => void): () => void {
  emitter.on("status-change", handler);
  return () => emitter.off("status-change", handler);
}

export function getServiceState(projectId: string, serviceId: string): ServiceState | null {
  const projectStates = serviceStates.get(projectId);
  if (!projectStates) return null;
  return projectStates.get(serviceId) || null;
}

export function reloadProjectServices(projectId: string): void {
  const config = loadConfig();
  const project = config.projects.find((p) => p.name === projectId);
  const projectStates = serviceStates.get(projectId);

  if (!projectStates) {
    serviceStates.set(projectId, new Map());
    return;
  }

  // Remove states for services that no longer exist
  const currentIds = new Set(project?.services?.map((s) => s.id) || []);
  for (const serviceId of projectStates.keys()) {
    if (!currentIds.has(serviceId)) {
      projectStates.delete(serviceId);
    }
  }

  logger.info({ projectId }, "Reloaded project services");
}

export { getSessionName };
