import { useState } from "react";
import {
  useAgentRun,
  useStartAgentRun,
  type AgentMessage,
  type AgentStatus,
  type PendingPermission,
} from "../hooks/useAgentRun.ts";
import { colors, fonts, radius, buttonPrimary, buttonSecondary, buttonDanger } from "../theme.ts";

interface AgentRunPanelProps {
  projectId: string;
  ticketId: string;
  ticketTitle?: string;
  onClose?: () => void;
}

const statusLabels: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Running",
  waiting_permission: "Waiting for Permission",
  waiting_question: "Waiting for Answer",
  completed: "Completed",
  failed: "Failed",
};

const statusColors: Record<AgentStatus, string> = {
  idle: colors.textMuted,
  running: colors.accent,
  waiting_permission: colors.warning,
  waiting_question: colors.warning,
  completed: colors.success,
  failed: colors.danger,
};

export function AgentRunPanel({ projectId, ticketId, ticketTitle, onClose }: AgentRunPanelProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);

  const startRun = useStartAgentRun(projectId);
  const { runStatus, messages, respondPermission, isRespondingPermission } = useAgentRun(
    projectId,
    runId
  );

  const handleStart = async () => {
    try {
      const result = await startRun.mutateAsync({ ticketId, autoMode });
      setRunId(result.runId);
    } catch {
      // Error handled by mutation
    }
  };

  const handleAllow = () => {
    respondPermission({ allow: true });
  };

  const handleDeny = () => {
    respondPermission({ allow: false, message: "User denied permission" });
  };

  const isActive =
    runStatus?.status === "running" ||
    runStatus?.status === "waiting_permission" ||
    runStatus?.status === "waiting_question";

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 400,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: colors.textPrimary }}>
            Claude Agent
          </span>
          {runStatus && (
            <span
              style={{
                fontSize: 12,
                padding: "2px 8px",
                borderRadius: radius.sm,
                backgroundColor: colors.overlay,
                color: statusColors[runStatus.status],
              }}
            >
              {statusLabels[runStatus.status]}
            </span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              ...buttonSecondary,
              padding: "4px 8px",
              fontSize: 12,
            }}
          >
            Close
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {!runId ? (
          <StartPanel
            ticketTitle={ticketTitle}
            autoMode={autoMode}
            setAutoMode={setAutoMode}
            onStart={handleStart}
            isStarting={startRun.isPending}
            error={startRun.error?.message}
          />
        ) : (
          <>
            {/* Permission Request */}
            {runStatus?.pendingPermission && (
              <PermissionRequest
                permission={runStatus.pendingPermission}
                onAllow={handleAllow}
                onDeny={handleDeny}
                isResponding={isRespondingPermission}
              />
            )}

            {/* Messages */}
            <MessageList messages={messages} />

            {/* Result */}
            {runStatus?.result && <ResultPanel result={runStatus.result} />}
          </>
        )}
      </div>

      {/* Footer */}
      {runStatus && (
        <div
          style={{
            padding: "8px 16px",
            borderTop: `1px solid ${colors.border}`,
            fontSize: 12,
            color: colors.textMuted,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Messages: {messages.length}</span>
          {runStatus.result && (
            <span>
              Cost: ${runStatus.result.costUsd.toFixed(4)} | Duration:{" "}
              {(runStatus.result.durationMs / 1000).toFixed(1)}s
            </span>
          )}
          {isActive && <span>Running...</span>}
        </div>
      )}
    </div>
  );
}

function StartPanel({
  ticketTitle,
  autoMode,
  setAutoMode,
  onStart,
  isStarting,
  error,
}: {
  ticketTitle?: string;
  autoMode: boolean;
  setAutoMode: (v: boolean) => void;
  onStart: () => void;
  isStarting: boolean;
  error?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ color: colors.textSecondary, margin: 0 }}>
        Run Claude Agent to work on this ticket{ticketTitle ? `: "${ticketTitle}"` : ""}.
      </p>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: colors.textSecondary,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={autoMode}
          onChange={(e) => setAutoMode(e.target.checked)}
          style={{ cursor: "pointer" }}
        />
        <span>Auto mode (auto-approve file edits)</span>
      </label>

      {error && (
        <div style={{ color: colors.danger, fontSize: 14 }}>
          Error: {error}
        </div>
      )}

      <button onClick={onStart} disabled={isStarting} style={buttonPrimary}>
        {isStarting ? "Starting..." : "Start Agent"}
      </button>
    </div>
  );
}

function PermissionRequest({
  permission,
  onAllow,
  onDeny,
  isResponding,
}: {
  permission: PendingPermission;
  onAllow: () => void;
  onDeny: () => void;
  isResponding: boolean;
}) {
  return (
    <div
      style={{
        backgroundColor: colors.overlay,
        border: `1px solid ${colors.warning}`,
        borderRadius: radius.md,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ color: colors.warning, fontSize: 18 }}>⚠</span>
        <span style={{ color: colors.textPrimary, fontWeight: 600 }}>Permission Required</span>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 4 }}>
          Tool: <span style={{ color: colors.textPrimary }}>{permission.toolName}</span>
        </div>
        <pre
          style={{
            backgroundColor: colors.surface,
            padding: 8,
            borderRadius: radius.sm,
            fontSize: 12,
            fontFamily: fonts.mono,
            color: colors.textSecondary,
            overflow: "auto",
            maxHeight: 200,
            margin: 0,
          }}
        >
          {JSON.stringify(permission.input, null, 2)}
        </pre>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onAllow} disabled={isResponding} style={buttonPrimary}>
          Allow
        </button>
        <button onClick={onDeny} disabled={isResponding} style={buttonDanger}>
          Deny
        </button>
      </div>
    </div>
  );
}

function MessageList({ messages }: { messages: AgentMessage[] }) {
  if (messages.length === 0) {
    return (
      <div style={{ color: colors.textMuted, fontStyle: "italic" }}>
        Waiting for agent output...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {messages.map((msg, i) => (
        <MessageItem key={i} message={msg} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: AgentMessage }) {
  // Filter out messages we don't want to show
  if (message.type === "stream_event") return null;

  // System init message
  if (message.type === "system" && message.subtype === "init") {
    return (
      <div style={{ color: colors.textMuted, fontSize: 12 }}>
        Session started • Model: {(message as { model?: string }).model || "unknown"}
      </div>
    );
  }

  // Assistant message with content
  if (message.type === "assistant" && message.message?.content) {
    return (
      <div
        style={{
          backgroundColor: colors.overlay,
          borderRadius: radius.sm,
          padding: 12,
        }}
      >
        {message.message.content.map((block, i) => {
          if (block.type === "text" && block.text) {
            return (
              <div key={i} style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" }}>
                {block.text}
              </div>
            );
          }
          if (block.type === "tool_use") {
            return (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: colors.textSecondary,
                  fontFamily: fonts.mono,
                  marginTop: i > 0 ? 8 : 0,
                }}
              >
                Using tool: {block.name}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Result message
  if (message.type === "result") {
    return null; // Handled separately
  }

  // Tool progress
  if (message.type === "tool_progress") {
    return (
      <div style={{ color: colors.textMuted, fontSize: 12, fontFamily: fonts.mono }}>
        Tool running: {(message as { tool_name?: string }).tool_name}...
      </div>
    );
  }

  return null;
}

function ResultPanel({ result }: { result: { success: boolean; result?: string; error?: string } }) {
  return (
    <div
      style={{
        backgroundColor: result.success ? colors.surfaceRaised : colors.surface,
        border: `1px solid ${result.success ? colors.success : colors.danger}`,
        borderRadius: radius.md,
        padding: 16,
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          color: result.success ? colors.success : colors.danger,
          fontWeight: 600,
        }}
      >
        {result.success ? "✓ Completed" : "✗ Failed"}
      </div>
      {result.result && (
        <div style={{ color: colors.textPrimary, whiteSpace: "pre-wrap" }}>{result.result}</div>
      )}
      {result.error && (
        <div style={{ color: colors.danger }}>{result.error}</div>
      )}
    </div>
  );
}
