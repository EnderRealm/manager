import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { colors, fonts, radius } from "../theme.ts";

interface LogsPanelProps {
  projectId: string;
  serviceId: string | null;
  onClose: () => void;
}

interface LogsResponse {
  logs: string;
  sessionName: string;
}

async function fetchLogs(projectId: string, serviceId: string): Promise<LogsResponse> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}/logs?lines=500`);
  if (!res.ok) {
    throw new Error("Failed to fetch logs");
  }
  return res.json();
}

export function LogsPanel({ projectId, serviceId, onClose }: LogsPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["service-logs", projectId, serviceId],
    queryFn: () => fetchLogs(projectId, serviceId!),
    enabled: !!serviceId,
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.logs]);

  const handleCopyAttachCommand = async () => {
    if (!data?.sessionName) return;
    const cmd = `tmux attach -t ${data.sessionName}`;
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SlideOutPanel open={!!serviceId} onClose={onClose}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: `1px solid ${colors.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: colors.textPrimary,
              }}
            >
              Service Logs
            </h2>
            {data?.sessionName && (
              <div
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  fontFamily: fonts.mono,
                  marginTop: 4,
                }}
              >
                {data.sessionName}
              </div>
            )}
          </div>
          <button
            onClick={handleCopyAttachCommand}
            style={{
              padding: "6px 12px",
              backgroundColor: colors.overlay,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              color: colors.textSecondary,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {copied ? "Copied!" : "Copy attach command"}
          </button>
        </div>

        {/* Logs content */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            backgroundColor: "#0d1117",
            padding: 16,
          }}
        >
          {isLoading && (
            <div style={{ color: colors.textMuted, fontFamily: fonts.mono }}>
              Loading logs...
            </div>
          )}
          {error && (
            <div style={{ color: colors.danger, fontFamily: fonts.mono }}>
              Error loading logs
            </div>
          )}
          {data && (
            <pre
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#c9d1d9",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {data.logs || "(no output)"}
              <div ref={logsEndRef} />
            </pre>
          )}
        </div>
      </div>
    </SlideOutPanel>
  );
}
