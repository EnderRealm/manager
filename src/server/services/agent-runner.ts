import { query, type Options, type SDKMessage, type PermissionResult } from "@anthropic-ai/claude-agent-sdk";
import { logger } from "../lib/logger.ts";
import type { Ticket } from "./tk.ts";

export type AgentStatus = "idle" | "running" | "waiting_permission" | "waiting_question" | "completed" | "failed";

export interface AgentRun {
  id: string;
  ticketId: string;
  projectPath: string;
  status: AgentStatus;
  sessionId?: string;
  messages: SDKMessage[];
  pendingPermission?: PendingPermission;
  pendingQuestion?: PendingQuestion;
  result?: AgentResult;
  startedAt: number;
  completedAt?: number;
}

export interface PendingPermission {
  toolName: string;
  input: Record<string, unknown>;
  toolUseId: string;
  resolve: (result: PermissionResult) => void;
}

export interface PendingQuestion {
  question: string;
  options: string[];
  resolve: (answer: string) => void;
}

export interface AgentResult {
  success: boolean;
  result?: string;
  error?: string;
  costUsd: number;
  durationMs: number;
}

// Active agent runs indexed by run ID
const activeRuns = new Map<string, AgentRun>();

// Event emitter for streaming updates to clients
type AgentEventHandler = (runId: string, event: AgentEvent) => void;
const eventHandlers = new Set<AgentEventHandler>();

export type AgentEvent =
  | { type: "status_change"; status: AgentStatus }
  | { type: "message"; message: SDKMessage }
  | { type: "permission_request"; permission: Omit<PendingPermission, "resolve"> }
  | { type: "question"; question: Omit<PendingQuestion, "resolve"> }
  | { type: "completed"; result: AgentResult };

export function subscribeToAgentEvents(handler: AgentEventHandler): () => void {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

function emitEvent(runId: string, event: AgentEvent): void {
  for (const handler of eventHandlers) {
    try {
      handler(runId, event);
    } catch (err) {
      logger.error({ err, runId }, "Error in agent event handler");
    }
  }
}

function generateRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTicketPrompt(ticket: Ticket, projectPath: string): string {
  const sections = [
    `# Task: ${ticket.title}`,
    "",
    `**Type:** ${ticket.type}`,
    `**Priority:** ${ticket.priority}`,
    `**ID:** ${ticket.id}`,
    "",
  ];

  if (ticket.description) {
    sections.push("## Description", ticket.description, "");
  }

  if (ticket.design) {
    sections.push("## Design Notes", ticket.design, "");
  }

  if (ticket.acceptanceCriteria) {
    sections.push("## Acceptance Criteria", ticket.acceptanceCriteria, "");
  }

  sections.push(
    "## Instructions",
    "Complete this task. The codebase is already set up.",
    `Working directory: ${projectPath}`,
    "",
    "When finished, summarize what was done."
  );

  return sections.join("\n");
}

function determinePermissionMode(ticket: Ticket): Options["permissionMode"] {
  // Auto-approve more for low-priority chores/tasks
  if (ticket.type === "chore" || ticket.type === "task") {
    if (ticket.priority >= 3) {
      return "acceptEdits"; // Auto-approve file edits for P3-P4 chores/tasks
    }
  }
  return "default"; // Prompt for everything else
}

export async function startAgentRun(
  ticket: Ticket,
  projectPath: string,
  options?: { autoMode?: boolean }
): Promise<string> {
  const runId = generateRunId();
  const prompt = formatTicketPrompt(ticket, projectPath);
  const permissionMode = options?.autoMode ? "acceptEdits" : determinePermissionMode(ticket);

  const run: AgentRun = {
    id: runId,
    ticketId: ticket.id,
    projectPath,
    status: "running",
    messages: [],
    startedAt: Date.now(),
  };

  activeRuns.set(runId, run);
  emitEvent(runId, { type: "status_change", status: "running" });

  logger.info({ runId, ticketId: ticket.id, permissionMode }, "Starting agent run");

  // Run the agent in the background
  runAgent(run, prompt, permissionMode).catch((err) => {
    logger.error({ err, runId }, "Agent run failed");
    run.status = "failed";
    run.result = {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
      costUsd: 0,
      durationMs: Date.now() - run.startedAt,
    };
    run.completedAt = Date.now();
    emitEvent(runId, { type: "status_change", status: "failed" });
    emitEvent(runId, { type: "completed", result: run.result });
  });

  return runId;
}

async function runAgent(
  run: AgentRun,
  prompt: string,
  permissionMode: Options["permissionMode"]
): Promise<void> {
  const abortController = new AbortController();

  const queryOptions: Options = {
    cwd: run.projectPath,
    permissionMode,
    allowedTools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "WebFetch", "WebSearch"],
    abortController,
    canUseTool: async (toolName, input, options) => {
      // For acceptEdits mode, file operations are auto-approved
      // But we still want to intercept Bash for approval in some cases
      if (permissionMode === "acceptEdits" && toolName !== "Bash") {
        return { behavior: "allow" };
      }

      // Create a promise that will be resolved when the user responds
      return new Promise<PermissionResult>((resolve) => {
        run.pendingPermission = {
          toolName,
          input,
          toolUseId: options.toolUseID,
          resolve,
        };
        run.status = "waiting_permission";

        emitEvent(run.id, { type: "status_change", status: "waiting_permission" });
        emitEvent(run.id, {
          type: "permission_request",
          permission: { toolName, input, toolUseId: options.toolUseID },
        });
      });
    },
  };

  try {
    for await (const message of query({ prompt, options: queryOptions })) {
      run.messages.push(message);
      emitEvent(run.id, { type: "message", message });

      // Capture session ID from init message
      if (message.type === "system" && message.subtype === "init") {
        run.sessionId = message.session_id;
      }

      // Handle result message
      if (message.type === "result") {
        run.completedAt = Date.now();
        if (message.subtype === "success") {
          run.status = "completed";
          run.result = {
            success: true,
            result: message.result,
            costUsd: message.total_cost_usd,
            durationMs: message.duration_ms,
          };
        } else {
          run.status = "failed";
          run.result = {
            success: false,
            error: message.errors?.join(", ") || "Unknown error",
            costUsd: message.total_cost_usd,
            durationMs: message.duration_ms,
          };
        }
        emitEvent(run.id, { type: "status_change", status: run.status });
        emitEvent(run.id, { type: "completed", result: run.result });
      }
    }
  } finally {
    // Clear pending state
    run.pendingPermission = undefined;
    run.pendingQuestion = undefined;
  }
}

export function respondToPermission(runId: string, allow: boolean, message?: string): void {
  const run = activeRuns.get(runId);
  if (!run || !run.pendingPermission) {
    throw new Error("No pending permission request");
  }

  const { resolve } = run.pendingPermission;
  run.pendingPermission = undefined;
  run.status = "running";
  emitEvent(runId, { type: "status_change", status: "running" });

  if (allow) {
    resolve({ behavior: "allow" });
  } else {
    resolve({ behavior: "deny", message: message || "User denied permission" });
  }
}

export function getAgentRun(runId: string): AgentRun | undefined {
  return activeRuns.get(runId);
}

export function getActiveRuns(): AgentRun[] {
  return Array.from(activeRuns.values()).filter(
    (run) => run.status === "running" || run.status === "waiting_permission" || run.status === "waiting_question"
  );
}

export function getRunsForTicket(ticketId: string): AgentRun[] {
  return Array.from(activeRuns.values()).filter((run) => run.ticketId === ticketId);
}
