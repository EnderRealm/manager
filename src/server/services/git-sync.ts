import { execGit } from "./git.ts";
import { logger } from "../lib/logger.ts";

export interface SyncStatus {
  state: "synced" | "pending" | "error";
  error?: string;
  lastSynced?: number;
}

type SyncStatusHandler = (projectId: string, status: SyncStatus) => void;

const syncStatuses = new Map<string, SyncStatus>();
const debounceTimers = new Map<string, NodeJS.Timeout>();
const statusHandlers = new Set<SyncStatusHandler>();

const DEBOUNCE_MS = 30_000;

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
  const result = await execGit(projectPath, ["pull", "--ff-only"]);

  if (result.exitCode !== 0) {
    const error = `git pull failed (exit ${result.exitCode})`;
    logger.error({ projectId, projectPath, stdout: result.stdout }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  logger.info({ projectId }, "git pull succeeded");
  return true;
}

export async function gitCommitAndPush(
  projectPath: string,
  projectId: string
): Promise<boolean> {
  // Stage .tickets/ changes
  const addResult = await execGit(projectPath, ["add", ".tickets/"]);
  if (addResult.exitCode !== 0) {
    const error = `git add failed (exit ${addResult.exitCode})`;
    logger.error({ projectId, stdout: addResult.stdout }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  // Check if there's anything staged
  const diffResult = await execGit(projectPath, [
    "diff",
    "--cached",
    "--quiet",
  ]);
  if (diffResult.exitCode === 0) {
    // Nothing to commit
    logger.debug({ projectId }, "No ticket changes to commit");
    setSyncStatus(projectId, { state: "synced", lastSynced: Date.now() });
    return true;
  }

  // Commit
  const commitResult = await execGit(projectPath, [
    "commit",
    "-m",
    "Update tickets",
  ]);
  if (commitResult.exitCode !== 0) {
    const error = `git commit failed (exit ${commitResult.exitCode})`;
    logger.error({ projectId, stdout: commitResult.stdout }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  // Push
  const pushResult = await execGit(projectPath, ["push"]);
  if (pushResult.exitCode !== 0) {
    const error = `git push failed (exit ${pushResult.exitCode})`;
    logger.error({ projectId, stdout: pushResult.stdout }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  logger.info({ projectId }, "Ticket changes committed and pushed");
  setSyncStatus(projectId, { state: "synced", lastSynced: Date.now() });
  return true;
}

export function scheduleSyncForProject(
  projectId: string,
  projectPath: string
): void {
  const existing = debounceTimers.get(projectId);
  if (existing) {
    clearTimeout(existing);
  }

  setSyncStatus(projectId, { state: "pending" });

  debounceTimers.set(
    projectId,
    setTimeout(async () => {
      debounceTimers.delete(projectId);
      await gitCommitAndPush(projectPath, projectId);
    }, DEBOUNCE_MS)
  );
}
