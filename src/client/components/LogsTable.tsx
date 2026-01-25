import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnFiltersState,
  type ColumnResizeMode,
} from "@tanstack/react-table";
import { useTablePreferences } from "../hooks/useTablePreferences.ts";
import { colors, fonts, radius } from "../theme.ts";

interface LogsTableProps {
  projectId: string;
  serviceId: string;
  serviceName: string;
}

interface LogsResponse {
  logs: string;
  sessionName: string;
}

interface ParsedLogLine {
  lineNumber: number;
  timestamp: string;
  level: string;
  message: string;
  raw: string;
}

const levelColors: Record<string, string> = {
  ERROR: colors.danger,
  FATAL: colors.danger,
  WARN: colors.warning,
  INFO: colors.accent,
  DEBUG: colors.textMuted,
  TRACE: colors.textMuted,
};

const pinoLevelNames: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

// Levels ordered by severity (least to most severe)
const levelOptions = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"];

// Numeric severity for filtering (higher = more severe)
const levelSeverity: Record<string, number> = {
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
};

function parseLogLine(line: string, lineNumber: number): ParsedLogLine {
  let timestamp = "-";
  let level = "";
  let message = line;

  // Try to parse as JSON (pino format)
  if (line.startsWith("{")) {
    try {
      const json = JSON.parse(line);

      if (json.time) {
        const date = new Date(json.time);
        timestamp = date.toLocaleTimeString("en-US", { hour12: false });
      }

      if (typeof json.level === "number") {
        level = pinoLevelNames[json.level] || "";
      } else if (typeof json.level === "string") {
        level = json.level.toUpperCase();
      }

      const msg = json.msg || "";
      const extras: string[] = [];

      for (const [key, value] of Object.entries(json)) {
        if (!["level", "time", "pid", "hostname", "msg", "name"].includes(key)) {
          if (typeof value === "object") {
            extras.push(`${key}=${JSON.stringify(value)}`);
          } else {
            extras.push(`${key}=${value}`);
          }
        }
      }

      message = msg + (extras.length > 0 ? " " + extras.join(" ") : "");
      return { lineNumber, timestamp, level, message, raw: line };
    } catch {
      // Not valid JSON
    }
  }

  const isoMatch = line.match(/^(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/);
  if (isoMatch && isoMatch[1]) {
    timestamp = isoMatch[1].replace("T", " ").replace(/\.\d+Z?$/, "").substring(11, 19);
    message = line.substring(isoMatch[0].length).trim();
  }

  const timeMatch = line.match(/^\[?(\d{2}:\d{2}:\d{2})\]?/);
  if (!isoMatch && timeMatch && timeMatch[1]) {
    timestamp = timeMatch[1];
    message = line.substring(timeMatch[0].length).trim();
  }

  const levelMatch = message.match(/^\[?(ERROR|WARN(?:ING)?|INFO|DEBUG)\]?[:\s]*/i);
  if (levelMatch && levelMatch[1]) {
    level = levelMatch[1].toUpperCase().replace("WARNING", "WARN");
    message = message.substring(levelMatch[0].length);
  }

  return { lineNumber, timestamp, level, message, raw: line };
}

function AnsiText({ text }: { text: string }) {
  const parts = useMemo(() => {
    const result: Array<{ text: string; style: React.CSSProperties }> = [];
    let currentStyle: React.CSSProperties = {};

    const ansiRegex = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let match;

    while ((match = ansiRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const currentText = text.slice(lastIndex, match.index);
        if (currentText) {
          result.push({ text: currentText, style: { ...currentStyle } });
        }
      }

      const codes = (match[1] ?? "").split(";").map(Number);
      for (const code of codes) {
        switch (code) {
          case 0: currentStyle = {}; break;
          case 1: currentStyle.fontWeight = "bold"; break;
          case 2: currentStyle.opacity = 0.7; break;
          case 3: currentStyle.fontStyle = "italic"; break;
          case 4: currentStyle.textDecoration = "underline"; break;
          case 30: currentStyle.color = "#282c34"; break;
          case 31: currentStyle.color = colors.danger; break;
          case 32: currentStyle.color = colors.success; break;
          case 33: currentStyle.color = colors.warning; break;
          case 34: currentStyle.color = colors.accent; break;
          case 35: currentStyle.color = "#c678dd"; break;
          case 36: currentStyle.color = "#56b6c2"; break;
          case 37: currentStyle.color = colors.textPrimary; break;
          case 90: currentStyle.color = colors.textMuted; break;
          case 91: currentStyle.color = "#e06c75"; break;
          case 92: currentStyle.color = "#98c379"; break;
          case 93: currentStyle.color = "#e5c07b"; break;
          case 94: currentStyle.color = "#61afef"; break;
          case 95: currentStyle.color = "#c678dd"; break;
          case 96: currentStyle.color = "#56b6c2"; break;
          case 97: currentStyle.color = "#ffffff"; break;
        }
      }
      lastIndex = ansiRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ text: text.slice(lastIndex), style: { ...currentStyle } });
    }

    return result;
  }, [text]);

  if (parts.length === 0) return <span>{text}</span>;

  return (
    <>
      {parts.map((part, i) => (
        <span key={i} style={part.style}>{part.text}</span>
      ))}
    </>
  );
}

const columnHelper = createColumnHelper<ParsedLogLine>();

const defaultColumnWidths: Record<string, number> = {
  lineNumber: 50,
  timestamp: 85,
  level: 60,
  message: 600,
};

export function LogsTable({ projectId, serviceId, serviceName }: LogsTableProps) {
  const [copied, setCopied] = useState(false);
  const { preferences, updatePreferences } = useTablePreferences("logsTable");

  const [sorting, setSorting] = useState<SortingState>(
    preferences?.sorting ?? []
  );
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    preferences?.columnFilters ?? []
  );
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(
    preferences?.columnWidths ?? defaultColumnWidths
  );

  useEffect(() => {
    if (preferences?.sorting) setSorting(preferences.sorting);
    if (preferences?.columnFilters) setColumnFilters(preferences.columnFilters);
    if (preferences?.columnWidths) setColumnSizing(preferences.columnWidths);
  }, [preferences]);

  const { data, isLoading } = useQuery({
    queryKey: ["logs", projectId, serviceId],
    queryFn: async (): Promise<LogsResponse> => {
      const res = await fetch(`/api/projects/${projectId}/services/${serviceId}/logs?lines=500`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: 2000,
  });

  const parsedLines = useMemo(() => {
    if (!data?.logs) return [];
    const lines = data.logs.split("\n").filter((line) => line.trim());
    const totalLines = lines.length;
    return lines
      .map((line, i) => parseLogLine(line, i + 1))
      .reverse()
      .map((parsed, i) => ({ ...parsed, lineNumber: totalLines - i }));
  }, [data?.logs]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("lineNumber", {
        header: "#",
        size: columnSizing.lineNumber ?? defaultColumnWidths.lineNumber,
        cell: (info) => (
          <span style={{ color: colors.textMuted }}>{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("timestamp", {
        header: "Time",
        size: columnSizing.timestamp ?? defaultColumnWidths.timestamp,
        cell: (info) => (
          <span style={{ color: colors.textSecondary }}>{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("level", {
        header: "Level",
        size: columnSizing.level ?? defaultColumnWidths.level,
        filterFn: (row, columnId, filterValue) => {
          const rowLevel = row.getValue(columnId) as string;
          if (!filterValue || !rowLevel) return true;
          const rowSeverity = levelSeverity[rowLevel] ?? 0;
          const filterSeverity = levelSeverity[filterValue as string] ?? 0;
          return rowSeverity <= filterSeverity;
        },
        cell: (info) => {
          const level = info.getValue();
          return (
            <span
              style={{
                fontWeight: 500,
                color: level ? levelColors[level] || colors.textSecondary : colors.textMuted,
              }}
            >
              {level || "-"}
            </span>
          );
        },
      }),
      columnHelper.accessor("message", {
        header: "Message",
        size: columnSizing.message ?? defaultColumnWidths.message,
        enableSorting: false,
        cell: (info) => <AnsiText text={info.getValue()} />,
      }),
    ],
    [columnSizing]
  );

  const table = useReactTable({
    data: parsedLines,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnSizing,
    },
    columnResizeMode: "onChange" as ColumnResizeMode,
    onSortingChange: (updater) => {
      const newSorting = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(newSorting);
      updatePreferences({ sorting: newSorting });
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === "function" ? updater(columnFilters) : updater;
      setColumnFilters(newFilters);
      updatePreferences({ columnFilters: newFilters });
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: (updater) => {
      const newSizing = typeof updater === "function" ? updater(columnSizing) : updater;
      setColumnSizing(newSizing);
      updatePreferences({ columnWidths: newSizing });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const copyAttachCommand = () => {
    if (data?.sessionName) {
      navigator.clipboard.writeText(`tmux attach -t ${data.sessionName}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 16, color: colors.textMuted, fontSize: 13 }}>
        Loading logs...
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        overflow: "hidden",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.surfaceRaised,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: fonts.mono, fontSize: 13, fontWeight: 500, color: colors.textPrimary }}>
            {serviceName}
          </span>
          {data?.sessionName && (
            <span style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.textMuted }}>
              {data.sessionName}
            </span>
          )}
        </div>
        <button
          onClick={copyAttachCommand}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            fontFamily: fonts.mono,
            backgroundColor: copied ? colors.successEmphasis : colors.overlay,
            color: copied ? colors.textPrimary : colors.textSecondary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy attach cmd"}
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 12,
          padding: "10px 14px",
          borderBottom: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <input
          type="text"
          placeholder="Filter logs..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={{
            flex: 1,
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: fonts.mono,
            backgroundColor: colors.canvas,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            outline: "none",
          }}
        />
        <select
          value={(columnFilters.find((f) => f.id === "level")?.value as string) ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              setColumnFilters([{ id: "level", value }]);
              updatePreferences({ columnFilters: [{ id: "level", value }] });
            } else {
              setColumnFilters([]);
              updatePreferences({ columnFilters: [] });
            }
          }}
          style={{
            padding: "6px 10px",
            fontSize: 12,
            fontFamily: fonts.mono,
            backgroundColor: colors.canvas,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All levels</option>
          {levelOptions.map((level) => (
            <option key={level} value={level}>≤ {level}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    style={{
                      width: header.getSize(),
                      padding: "8px 10px",
                      textAlign: "left",
                      fontSize: 10,
                      fontWeight: 500,
                      fontFamily: fonts.mono,
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.border}`,
                      position: "sticky",
                      top: 0,
                      backgroundColor: colors.surface,
                      cursor: header.column.getCanSort() ? "pointer" : "default",
                      userSelect: "none",
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span>{header.column.getIsSorted() === "asc" ? " ↑" : " ↓"}</span>
                      )}
                    </div>
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          height: "100%",
                          width: 4,
                          cursor: "col-resize",
                          backgroundColor: header.column.getIsResizing() ? colors.accent : "transparent",
                        }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: "4px 10px",
                      fontSize: 11,
                      fontFamily: fonts.mono,
                      borderBottom: `1px solid ${colors.borderMuted}`,
                      verticalAlign: "top",
                      textAlign: "left",
                      overflow: "hidden",
                      whiteSpace: cell.column.id === "message" ? "pre-wrap" : "nowrap",
                      wordBreak: cell.column.id === "message" ? "break-word" : "normal",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{ padding: 24, textAlign: "center", color: colors.textMuted, fontSize: 13 }}
                >
                  No logs available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
