import { execGit } from "./git.ts";
import { logger } from "../lib/logger.ts";

export interface SyncStatus {
  state: "synced" | "skipped" | "error";
  error?: string;
  reason?: string;
  lastSynced?: number;
}

type SyncStatusHandler = (projectId: string, status: SyncStatus) => void;

const syncStatuses = new Map<string, SyncStatus>();
const statusHandlers = new Set<SyncStatusHandler>();

function setSyncStatus(projectId: string, status: SyncStatus) {
  syncStatuses.set(projectId, status);
  for (const handler of statusHandlers) {
    try {
      handler(projectId, status);
    } catch (err) {
      logger.error({ err }, "Error in sync status handler");
    }
  }
}

export function getSyncStatus(projectId: string): SyncStatus {
  return syncStatuses.get(projectId) ?? { state: "synced" };
}

export function onSyncStatusChange(handler: SyncStatusHandler): () => void {
  statusHandlers.add(handler);
  return () => statusHandlers.delete(handler);
}

export async function gitPull(
  projectPath: string,
  projectId: string
): Promise<boolean> {
  // Check if working tree is dirty — skip pull if so
  const status = await execGit(projectPath, ["status", "--porcelain"]);
  if (status.exitCode !== 0) {
    const error = `git status failed (exit ${status.exitCode}): ${status.stderr.trim()}`;
    logger.error({ projectId, projectPath }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  if (status.stdout.trim().length > 0) {
    const reason = "working tree has local changes";
    logger.info({ projectId, projectPath }, `Skipping git pull: ${reason}`);
    setSyncStatus(projectId, { state: "skipped", reason });
    return true;
  }

  const result = await execGit(projectPath, ["pull", "--ff-only"]);

  if (result.exitCode !== 0) {
    const error = `git pull failed (exit ${result.exitCode}): ${result.stderr.trim()}`;
    logger.error({ projectId, projectPath }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  logger.info({ projectId }, "git pull succeeded");
  setSyncStatus(projectId, { state: "synced", lastSynced: Date.now() });
  return true;
}
