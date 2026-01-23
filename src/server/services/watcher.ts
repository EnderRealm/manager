import { watch, type FSWatcher } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { logger } from "../lib/logger.ts";

export interface TicketChangeEvent {
  projectId: string;
  type: "change" | "add" | "remove";
  ticketId?: string;
  timestamp: number;
}

type ChangeHandler = (event: TicketChangeEvent) => void;

const watchers = new Map<string, FSWatcher>();
const handlers = new Set<ChangeHandler>();
const debounceTimers = new Map<string, NodeJS.Timeout>();

const DEBOUNCE_MS = 100;

function notifyHandlers(event: TicketChangeEvent) {
  for (const handler of handlers) {
    try {
      handler(event);
    } catch (err) {
      logger.error({ err }, "Error in change handler");
    }
  }
}

function handleFileChange(projectId: string, filename: string | null) {
  const key = `${projectId}:${filename ?? "dir"}`;

  const existing = debounceTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key);

      const ticketId = filename?.replace(/\.md$/, "");

      const event: TicketChangeEvent = {
        projectId,
        type: "change",
        ticketId: ticketId && ticketId.startsWith("m-") ? ticketId : undefined,
        timestamp: Date.now(),
      };

      logger.info({ projectId, filename, ticketId }, "Ticket file change detected");
      notifyHandlers(event);
    }, DEBOUNCE_MS)
  );
}

export function watchProject(projectId: string, projectPath: string): boolean {
  if (watchers.has(projectId)) {
    return true;
  }

  const ticketsDir = join(projectPath, ".tickets");
  if (!existsSync(ticketsDir)) {
    logger.warn({ projectId, ticketsDir }, "No .tickets directory found");
    return false;
  }

  try {
    const watcher = watch(ticketsDir, { recursive: false }, (eventType, filename) => {
      handleFileChange(projectId, filename);
    });

    watcher.on("error", (err) => {
      logger.error({ projectId, err: err.message }, "Watcher error");
      unwatchProject(projectId);
    });

    watchers.set(projectId, watcher);
    logger.info({ projectId, ticketsDir }, "Watching tickets directory");
    return true;
  } catch (err) {
    logger.error({ projectId, err }, "Failed to watch project");
    return false;
  }
}

export function unwatchProject(projectId: string): void {
  const watcher = watchers.get(projectId);
  if (watcher) {
    watcher.close();
    watchers.delete(projectId);
    logger.info({ projectId }, "Stopped watching project");
  }
}

export function onTicketChange(handler: ChangeHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function getWatchedProjects(): string[] {
  return Array.from(watchers.keys());
}
