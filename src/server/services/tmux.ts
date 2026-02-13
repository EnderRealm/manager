import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { logger, logsDir } from "../lib/logger.ts";

const SESSION_PREFIX = "mgr";

function buildSessionName(projectId: string, serviceId: string): string {
  return `${SESSION_PREFIX}-${projectId}-${serviceId}`;
}

function getServiceLogPath(projectId: string, serviceId: string): string {
  return path.join(logsDir, "services", projectId, `${serviceId}.log`);
}

function readLogFile(projectId: string, serviceId: string, lines: number): string {
  const logPath = getServiceLogPath(projectId, serviceId);
  try {
    const content = fs.readFileSync(logPath, "utf-8");
    const allLines = content.split("\n");
    return allLines.slice(-lines).join("\n");
  } catch {
    return "";
  }
}

async function execTmux(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn("tmux", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      reject(err);
    });

    proc.on("close", (exitCode) => {
      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

export async function checkTmuxInstalled(): Promise<boolean> {
  try {
    const { exitCode } = await execTmux(["-V"]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function sessionExists(projectId: string, serviceId: string): Promise<boolean> {
  const sessionName = buildSessionName(projectId, serviceId);
  try {
    const { exitCode } = await execTmux(["has-session", "-t", sessionName]);
    return exitCode === 0;
  } catch {
    return false;
  }
}

export async function createSession(
  projectId: string,
  serviceId: string,
  cwd: string,
  cmd: string,
  env?: Record<string, string>
): Promise<void> {
  const sessionName = buildSessionName(projectId, serviceId);

  // Check if session already exists
  if (await sessionExists(projectId, serviceId)) {
    logger.warn({ sessionName }, "Session already exists");
    throw new Error(`Session ${sessionName} already exists`);
  }

  // Build environment string for tmux
  let envPrefix = "";
  if (env && Object.keys(env).length > 0) {
    envPrefix = Object.entries(env)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ") + " ";
  }

  const fullCmd = envPrefix + cmd;

  logger.info({ sessionName, cwd, cmd: fullCmd }, "Creating tmux session");

  const { exitCode, stderr } = await execTmux([
    "new-session",
    "-d",
    "-s", sessionName,
    "-c", cwd,
    fullCmd,
  ]);

  if (exitCode !== 0) {
    logger.error({ sessionName, exitCode, stderr }, "Failed to create session");
    throw new Error(`Failed to create session: ${stderr}`);
  }

  // Set up pipe-pane to persist output to a log file
  const logPath = getServiceLogPath(projectId, serviceId);
  const logDir = path.dirname(logPath);
  fs.mkdirSync(logDir, { recursive: true });
  fs.writeFileSync(logPath, "");

  const { exitCode: pipeExit, stderr: pipeStderr } = await execTmux([
    "pipe-pane", "-t", sessionName, `cat >> ${logPath}`,
  ]);

  if (pipeExit !== 0) {
    logger.warn({ sessionName, pipeStderr }, "Failed to set up pipe-pane");
  }
}

export async function killSession(projectId: string, serviceId: string): Promise<void> {
  const sessionName = buildSessionName(projectId, serviceId);

  if (!(await sessionExists(projectId, serviceId))) {
    logger.warn({ sessionName }, "Session does not exist");
    return;
  }

  // First try graceful shutdown with SIGINT (Ctrl-C)
  logger.info({ sessionName }, "Sending SIGINT to session");
  await execTmux(["send-keys", "-t", sessionName, "C-c"]);

  // Wait for up to 10 seconds for process to exit
  const startTime = Date.now();
  const timeout = 10000;

  while (Date.now() - startTime < timeout) {
    await new Promise((r) => setTimeout(r, 500));
    if (!(await sessionExists(projectId, serviceId))) {
      logger.info({ sessionName }, "Session terminated gracefully");
      return;
    }
  }

  // Force kill if still running
  logger.warn({ sessionName }, "Session did not terminate, force killing");
  const { exitCode, stderr } = await execTmux(["kill-session", "-t", sessionName]);

  if (exitCode !== 0 && await sessionExists(projectId, serviceId)) {
    logger.error({ sessionName, exitCode, stderr }, "Failed to kill session");
    throw new Error(`Failed to kill session: ${stderr}`);
  }
}

export async function captureLogs(
  projectId: string,
  serviceId: string,
  lines: number = 200
): Promise<string> {
  const sessionName = buildSessionName(projectId, serviceId);

  if (!(await sessionExists(projectId, serviceId))) {
    return readLogFile(projectId, serviceId, lines);
  }

  const { stdout, exitCode } = await execTmux([
    "capture-pane",
    "-t", sessionName,
    "-p",        // output to stdout
    "-J",        // join wrapped lines
    "-S", `-${lines}`,
  ]);

  if (exitCode !== 0) {
    return "";
  }

  return stdout;
}

export async function listSessions(): Promise<string[]> {
  try {
    const { stdout, exitCode } = await execTmux(["list-sessions", "-F", "#{session_name}"]);

    if (exitCode !== 0) {
      return [];
    }

    return stdout
      .trim()
      .split("\n")
      .filter((name) => name.startsWith(`${SESSION_PREFIX}-`));
  } catch {
    return [];
  }
}

export function parseSessionName(sessionName: string): { projectId: string; serviceId: string } | null {
  const prefix = `${SESSION_PREFIX}-`;
  if (!sessionName.startsWith(prefix)) {
    return null;
  }

  const rest = sessionName.slice(prefix.length);
  const dashIndex = rest.indexOf("-");
  if (dashIndex === -1) {
    return null;
  }

  return {
    projectId: rest.slice(0, dashIndex),
    serviceId: rest.slice(dashIndex + 1),
  };
}

export function getSessionName(projectId: string, serviceId: string): string {
  return buildSessionName(projectId, serviceId);
}

export interface ProcessStats {
  pid: number;
  cpu: number;
  memory: number; // RSS in bytes
  uptime: number; // seconds
  command: string;
}

export async function getSessionProcessStats(
  projectId: string,
  serviceId: string
): Promise<ProcessStats | null> {
  const sessionName = buildSessionName(projectId, serviceId);

  if (!(await sessionExists(projectId, serviceId))) {
    return null;
  }

  try {
    // Get the PID of the process running in the tmux pane
    const { stdout: pidOutput, exitCode: pidExit } = await execTmux([
      "display-message",
      "-t", sessionName,
      "-p", "#{pane_pid}",
    ]);

    if (pidExit !== 0 || !pidOutput.trim()) {
      return null;
    }

    const panePid = parseInt(pidOutput.trim(), 10);
    if (isNaN(panePid)) {
      return null;
    }

    // Get stats for the pane process directly (tmux runs commands directly, not via shell)
    const { stdout: psOutput } = await execPs(panePid);
    if (!psOutput.trim()) {
      return null;
    }

    // Parse ps output: PID, %CPU, RSS (KB), ELAPSED, COMMAND
    const lines = psOutput.trim().split("\n");
    if (lines.length < 2) {
      return null;
    }

    // Skip header
    const processLine = lines[1];
    if (!processLine) {
      return null;
    }

    const parts = processLine.trim().split(/\s+/);
    if (parts.length < 5) {
      return null;
    }

    const pid = parseInt(parts[0] || "0", 10);
    const cpu = parseFloat(parts[1] || "0");
    const rssKb = parseInt(parts[2] || "0", 10);
    const elapsed = parts[3] || "0:00";
    const command = parts.slice(4).join(" ");

    return {
      pid,
      cpu,
      memory: rssKb * 1024, // Convert KB to bytes
      uptime: parseElapsed(elapsed),
      command,
    };
  } catch (err) {
    logger.debug({ projectId, serviceId, err }, "Failed to get process stats");
    return null;
  }
}

async function execPs(pid: number): Promise<{ stdout: string }> {
  return new Promise((resolve) => {
    const proc = spawn("ps", ["-o", "pid,pcpu,rss,etime,command", "-p", String(pid)], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.on("close", () => {
      resolve({ stdout });
    });

    proc.on("error", () => {
      resolve({ stdout: "" });
    });
  });
}

function parseElapsed(elapsed: string): number {
  // Format: [[DD-]HH:]MM:SS or MM:SS.xx
  const parts = elapsed.split(/[-:]/);
  let seconds = 0;

  if (elapsed.includes("-")) {
    // DD-HH:MM:SS
    const days = parseInt(parts[0] || "0", 10);
    const hours = parseInt(parts[1] || "0", 10);
    const mins = parseInt(parts[2] || "0", 10);
    const secs = parseInt(parts[3] || "0", 10);
    seconds = days * 86400 + hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const hours = parseInt(parts[0] || "0", 10);
    const mins = parseInt(parts[1] || "0", 10);
    const secs = parseInt(parts[2] || "0", 10);
    seconds = hours * 3600 + mins * 60 + secs;
  } else if (parts.length === 2) {
    // MM:SS
    const mins = parseInt(parts[0] || "0", 10);
    const secs = parseFloat(parts[1] || "0");
    seconds = mins * 60 + Math.floor(secs);
  }

  return seconds;
}
