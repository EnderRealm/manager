import { spawn } from "node:child_process";
import { logger } from "../lib/logger.ts";

const SESSION_PREFIX = "mgr";

function buildSessionName(projectId: string, serviceId: string): string {
  return `${SESSION_PREFIX}-${projectId}-${serviceId}`;
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
    return "";
  }

  const { stdout, exitCode } = await execTmux([
    "capture-pane",
    "-t", sessionName,
    "-p",
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
