import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { colors, fonts, radius } from "../theme.ts";

// ANSI color code to CSS color mapping
const ansiColors: Record<number, string> = {
  30: "#6e7681", // black (dim)
  31: "#ff7b72", // red
  32: "#7ee787", // green
  33: "#d29922", // yellow
  34: "#79c0ff", // blue
  35: "#d2a8ff", // magenta
  36: "#a5d6ff", // cyan
  37: "#c9d1d9", // white
  90: "#6e7681", // bright black (gray)
  91: "#ffa198", // bright red
  92: "#7ee787", // bright green
  93: "#f0c040", // bright yellow
  94: "#79c0ff", // bright blue
  95: "#d2a8ff", // bright magenta
  96: "#a5d6ff", // bright cyan
  97: "#ffffff", // bright white
};

const ansiBgColors: Record<number, string> = {
  40: "#0d1117",
  41: "#5c2d2d",
  42: "#2d5c2d",
  43: "#5c5c2d",
  44: "#2d2d5c",
  45: "#5c2d5c",
  46: "#2d5c5c",
  47: "#4d4d4d",
};

interface StyledSpan {
  text: string;
  color?: string;
  bgColor?: string;
  bold?: boolean;
  dim?: boolean;
}

function parseAnsi(text: string): StyledSpan[] {
  const result: StyledSpan[] = [];
  const regex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentColor: string | undefined;
  let currentBg: string | undefined;
  let bold = false;
  let dim = false;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({
        text: text.slice(lastIndex, match.index),
        color: currentColor,
        bgColor: currentBg,
        bold,
        dim,
      });
    }

    const codes = (match[1] || "0").split(";").map(Number);
    for (const code of codes) {
      if (code === 0) {
        currentColor = undefined;
        currentBg = undefined;
        bold = false;
        dim = false;
      } else if (code === 1) {
        bold = true;
      } else if (code === 2) {
        dim = true;
      } else if (code >= 30 && code <= 37) {
        currentColor = ansiColors[code];
      } else if (code >= 90 && code <= 97) {
        currentColor = ansiColors[code];
      } else if (code >= 40 && code <= 47) {
        currentBg = ansiBgColors[code];
      }
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push({
      text: text.slice(lastIndex),
      color: currentColor,
      bgColor: currentBg,
      bold,
      dim,
    });
  }

  return result;
}

// Log level colors
const levelColors: Record<string, string> = {
  error: "#ff7b72",
  err: "#ff7b72",
  fatal: "#ff7b72",
  warn: "#d29922",
  warning: "#d29922",
  info: "#79c0ff",
  debug: "#6e7681",
  trace: "#6e7681",
};

function highlightLogLine(spans: StyledSpan[]): StyledSpan[] {
  return spans.map((span) => {
    if (span.color) return span; // Already colored by ANSI

    let { text } = span;
    const result: StyledSpan[] = [];
    let remaining = text;

    // Highlight timestamps like 2026-01-23T10:30:45.123Z or [10:30:45]
    const timestampRegex = /(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?|\[\d{2}:\d{2}:\d{2}\])/g;
    // Highlight log levels
    const levelRegex = /\b(ERROR|FATAL|WARN|WARNING|INFO|DEBUG|TRACE|error|fatal|warn|warning|info|debug|trace)\b/gi;
    // Highlight JSON-like structures
    const jsonRegex = /(\{[^{}]*\})/g;

    // Simple approach: color the whole span based on content
    const levelMatch = text.match(levelRegex);
    if (levelMatch) {
      const level = levelMatch[0].toLowerCase();
      if (levelColors[level]) {
        return { ...span, color: levelColors[level] };
      }
    }

    return span;
  });
}

function LogLine({ line }: { line: string }) {
  const spans = useMemo(() => {
    const parsed = parseAnsi(line);
    return highlightLogLine(parsed);
  }, [line]);

  return (
    <div style={{ minHeight: "1.5em" }}>
      {spans.map((span, i) => (
        <span
          key={i}
          style={{
            color: span.color || "#c9d1d9",
            backgroundColor: span.bgColor,
            fontWeight: span.bold ? 600 : undefined,
            opacity: span.dim ? 0.6 : undefined,
          }}
        >
          {span.text}
        </span>
      ))}
    </div>
  );
}

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
            <div
              style={{
                margin: 0,
                fontFamily: fonts.mono,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#c9d1d9",
              }}
            >
              {data.logs ? (
                data.logs.split("\n").map((line, i) => (
                  <LogLine key={i} line={line} />
                ))
              ) : (
                <span style={{ color: colors.textMuted }}>(no output)</span>
              )}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </SlideOutPanel>
  );
}
