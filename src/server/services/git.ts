import { spawn } from "node:child_process";
import { logger } from "../lib/logger.ts";

export interface GitStatus {
  branch: string;
  isDirty: boolean;
  ahead: number;
  behind: number;
}

async function execGit(
  projectPath: string,
  args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const proc = spawn("git", args, {
      cwd: projectPath,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.on("error", () => {
      resolve({ stdout: "", exitCode: 1 });
    });

    proc.on("close", (exitCode) => {
      resolve({ stdout, exitCode: exitCode ?? 1 });
    });
  });
}

export async function getGitStatus(
  projectPath: string
): Promise<GitStatus | null> {
  const branchResult = await execGit(projectPath, [
    "branch",
    "--show-current",
  ]);

  if (branchResult.exitCode !== 0) {
    logger.debug({ projectPath }, "Not a git repository");
    return null;
  }

  const branch = branchResult.stdout.trim() || "HEAD";

  const statusResult = await execGit(projectPath, ["status", "--porcelain"]);
  const isDirty = statusResult.stdout.trim().length > 0;

  let ahead = 0;
  let behind = 0;

  const trackingResult = await execGit(projectPath, [
    "rev-list",
    "--left-right",
    "--count",
    "@{upstream}...HEAD",
  ]);

  if (trackingResult.exitCode === 0) {
    const parts = trackingResult.stdout.trim().split(/\s+/);
    behind = parseInt(parts[0] ?? "0", 10) || 0;
    ahead = parseInt(parts[1] ?? "0", 10) || 0;
  }

  return { branch, isDirty, ahead, behind };
}
