import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type AgentStatus =
  | "idle"
  | "running"
  | "waiting_permission"
  | "waiting_question"
  | "completed"
  | "failed";

export interface PendingPermission {
  toolName: string;
  input: Record<string, unknown>;
  toolUseId: string;
}

export interface AgentResult {
  success: boolean;
  result?: string;
  error?: string;
  costUsd: number;
  durationMs: number;
}

export interface AgentRunStatus {
  id: string;
  ticketId: string;
  status: AgentStatus;
  sessionId?: string;
  pendingPermission?: PendingPermission;
  result?: AgentResult;
  startedAt: number;
  completedAt?: number;
  messageCount: number;
}

export interface AgentMessage {
  type: string;
  subtype?: string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: unknown;
    }>;
  };
  result?: string;
  session_id?: string;
  uuid?: string;
}

interface MessagesResponse {
  messages: AgentMessage[];
  nextIndex: number;
  status: AgentStatus;
  result?: AgentResult;
}

export function useAgentRun(projectId: string, runId: string | null) {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const messageIndexRef = useRef(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch run status
  const {
    data: runStatus,
    isLoading,
    error,
  } = useQuery<AgentRunStatus>({
    queryKey: ["agentRun", projectId, runId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/agents/runs/${runId}`);
      if (!res.ok) throw new Error("Failed to fetch run status");
      return res.json();
    },
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      // Keep polling while running or waiting
      if (
        data.status === "running" ||
        data.status === "waiting_permission" ||
        data.status === "waiting_question"
      ) {
        return 1000;
      }
      return false;
    },
  });

  // Poll for messages
  const fetchMessages = useCallback(async () => {
    if (!runId) return;

    try {
      const res = await fetch(
        `/api/projects/${projectId}/agents/runs/${runId}/messages?after=${messageIndexRef.current}`
      );
      if (!res.ok) return;

      const data: MessagesResponse = await res.json();
      if (data.messages.length > 0) {
        setMessages((prev) => [...prev, ...data.messages]);
        messageIndexRef.current = data.nextIndex;
      }

      // Stop polling if completed or failed
      if (data.status === "completed" || data.status === "failed") {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    } catch {
      // Ignore fetch errors during polling
    }
  }, [projectId, runId]);

  // Start/stop polling based on runId
  useEffect(() => {
    if (runId) {
      // Reset state for new run
      setMessages([]);
      messageIndexRef.current = 0;

      // Start polling
      fetchMessages();
      pollingRef.current = setInterval(fetchMessages, 500);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [runId, fetchMessages]);

  // Respond to permission
  const respondPermission = useMutation({
    mutationFn: async ({ allow, message }: { allow: boolean; message?: string }) => {
      const res = await fetch(`/api/projects/${projectId}/agents/runs/${runId}/permission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allow, message }),
      });
      if (!res.ok) throw new Error("Failed to respond to permission");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentRun", projectId, runId] });
    },
  });

  return {
    runStatus,
    messages,
    isLoading,
    error,
    respondPermission: respondPermission.mutate,
    isRespondingPermission: respondPermission.isPending,
  };
}

export function useStartAgentRun(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, autoMode }: { ticketId: string; autoMode?: boolean }) => {
      const res = await fetch(`/api/projects/${projectId}/agents/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, autoMode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to start agent");
      }
      return res.json() as Promise<{ runId: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agentRuns", projectId] });
    },
  });
}

export function useActiveAgentRuns(projectId: string) {
  return useQuery<{ runs: Array<{ id: string; ticketId: string; status: AgentStatus; startedAt: number }> }>({
    queryKey: ["agentRuns", projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/agents/runs`);
      if (!res.ok) throw new Error("Failed to fetch active runs");
      return res.json();
    },
    refetchInterval: 5000,
  });
}
