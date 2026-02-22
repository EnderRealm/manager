import { execGit } from "./git.ts";
import { logger } from "../lib/logger.ts";

export interface SyncStatus {
  state: "synced" | "pending" | "skipped" | "error";
  error?: string;
  reason?: string;
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

export async function gitCommitAndPush(
  projectPath: string,
  projectId: string
): Promise<boolean> {
  // Stage .tickets/ changes
  const addResult = await execGit(projectPath, ["add", ".tickets/"]);
  if (addResult.exitCode !== 0) {
    const error = `git add failed (exit ${addResult.exitCode}): ${addResult.stderr.trim()}`;
    logger.error({ projectId, projectPath }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  // Check if there's anything staged
  const diffResult = await execGit(projectPath, ["diff", "--cached", "--quiet"]);
  if (diffResult.exitCode === 0) {
    logger.debug({ projectId }, "No ticket changes to commit");
    setSyncStatus(projectId, { state: "synced", lastSynced: Date.now() });
    return true;
  }

  const commitResult = await execGit(projectPath, ["commit", "-m", "Update tickets"]);
  if (commitResult.exitCode !== 0) {
    const error = `git commit failed (exit ${commitResult.exitCode}): ${commitResult.stderr.trim()}`;
    logger.error({ projectId, projectPath }, error);
    setSyncStatus(projectId, { state: "error", error });
    return false;
  }

  const pushResult = await execGit(projectPath, ["push"]);
  if (pushResult.exitCode !== 0) {
    const error = `git push failed (exit ${pushResult.exitCode}): ${pushResult.stderr.trim()}`;
    logger.error({ projectId, projectPath }, error);
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
