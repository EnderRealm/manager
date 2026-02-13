import { useState, useMemo, useEffect } from "react";
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
import { type Service, type ServiceStatus } from "../hooks/useServices.ts";
import { useTablePreferences } from "../hooks/useTablePreferences.ts";
import { colors, fonts, radius } from "../theme.ts";

const statusColors: Record<ServiceStatus, string> = {
  stopped: colors.textMuted,
  starting: colors.warning,
  running: colors.success,
  unhealthy: colors.warning,
  crashed: colors.danger,
  restarting: colors.warning,
};

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface ServicesTableProps {
  services: Service[];
  isBusy: boolean;
  selectedServiceId: string | null;
  onSelectService: (serviceId: string | null) => void;
  onStart: (serviceId: string) => void;
  onStop: (serviceId: string) => void;
  onRestart: (serviceId: string) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

const columnHelper = createColumnHelper<Service>();

const defaultColumnWidths: Record<string, number> = {
  status: 50,
  name: 150,
  command: 200,
  port: 70,
  memory: 80,
  uptime: 80,
  actions: 180,
};

export function ServicesTable({
  services,
  isBusy,
  selectedServiceId,
  onSelectService,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
}: ServicesTableProps) {
  const { preferences, updatePreferences } = useTablePreferences("servicesTable");

  const [sorting, setSorting] = useState<SortingState>(
    preferences?.sorting ?? [{ id: "name", desc: false }]
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

  const columns = useMemo(
    () => [
      columnHelper.accessor("status", {
        header: "",
        size: columnSizing.status ?? defaultColumnWidths.status,
        enableSorting: false,
        cell: (info) => (
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: statusColors[info.getValue()],
              margin: "0 auto",
            }}
            title={info.getValue()}
          />
        ),
        filterFn: "equals",
      }),
      columnHelper.accessor("name", {
        header: "Name",
        size: columnSizing.name ?? defaultColumnWidths.name,
        cell: (info) => (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                fontFamily: fonts.mono,
                fontWeight: 500,
                color: colors.textPrimary,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {info.getValue()}
            </span>
            {info.row.original.type === "agent" && (
              <span
                style={{
                  padding: "2px 5px",
                  fontSize: 9,
                  fontWeight: 500,
                  fontFamily: fonts.mono,
                  backgroundColor: colors.accentEmphasis,
                  color: colors.accent,
                  borderRadius: radius.sm,
                  textTransform: "lowercase",
                  flexShrink: 0,
                }}
              >
                agent
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("cmd", {
        header: "Command",
        size: columnSizing.command ?? defaultColumnWidths.command,
        enableSorting: false,
        cell: (info) => (
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.textSecondary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              display: "block",
            }}
            title={info.getValue()}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("port", {
        header: "Port",
        size: columnSizing.port ?? defaultColumnWidths.port,
        cell: (info) => (
          <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary }}>
            {info.getValue() ?? "-"}
          </span>
        ),
      }),
      columnHelper.accessor(
        (row) => row.stats?.memory ?? null,
        {
          id: "memory",
          header: "Mem",
          size: columnSizing.memory ?? defaultColumnWidths.memory,
          cell: (info) => {
            const val = info.getValue();
            return (
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary }}>
                {val ? formatMemory(val) : "-"}
              </span>
            );
          },
        }
      ),
      columnHelper.accessor(
        (row) => row.stats?.uptime ?? null,
        {
          id: "uptime",
          header: "Up",
          size: columnSizing.uptime ?? defaultColumnWidths.uptime,
          cell: (info) => {
            const val = info.getValue();
            return (
              <span style={{ fontFamily: fonts.mono, fontSize: 12, color: colors.textSecondary }}>
                {val ? formatUptime(val) : "-"}
              </span>
            );
          },
        }
      ),
      columnHelper.display({
        id: "actions",
        header: "",
        size: columnSizing.actions ?? defaultColumnWidths.actions,
        cell: (info) => (
          <ActionButtons
            service={info.row.original}
            isBusy={isBusy}
            onStart={() => onStart(info.row.original.id)}
            onStop={() => onStop(info.row.original.id)}
            onRestart={() => onRestart(info.row.original.id)}
            onEdit={() => onEdit(info.row.original)}
            onDelete={() => onDelete(info.row.original)}
          />
        ),
      }),
    ],
    [columnSizing, isBusy, onStart, onStop, onRestart, onEdit, onDelete]
  );

  const table = useReactTable({
    data: services,
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

  const statusOptions: ServiceStatus[] = ["running", "stopped", "starting", "crashed", "unhealthy", "restarting"];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Filter services..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          style={{
            flex: 1,
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: fonts.mono,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            outline: "none",
          }}
        />
        <select
          value={(columnFilters.find((f) => f.id === "status")?.value as string) ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value) {
              setColumnFilters([{ id: "status", value }]);
              updatePreferences({ columnFilters: [{ id: "status", value }] });
            } else {
              setColumnFilters([]);
              updatePreferences({ columnFilters: [] });
            }
          }}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            fontFamily: fonts.mono,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          overflow: "hidden",
        }}
      >
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
                      padding: "10px 12px",
                      textAlign: "left",
                      fontSize: 11,
                      fontWeight: 500,
                      fontFamily: fonts.mono,
                      color: colors.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: `1px solid ${colors.border}`,
                      position: "relative",
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
                          backgroundColor: header.column.getIsResizing()
                            ? colors.accent
                            : "transparent",
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
              <tr
                key={row.id}
                onClick={() => {
                  const service = row.original;
                  onSelectService(selectedServiceId === service.id ? null : service.id);
                }}
                style={{
                  backgroundColor:
                    selectedServiceId === row.original.id
                      ? colors.overlay
                      : "transparent",
                  cursor: "pointer",
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: "10px 12px",
                      borderBottom: `1px solid ${colors.borderMuted}`,
                      overflow: "hidden",
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
                  style={{
                    padding: 24,
                    textAlign: "center",
                    color: colors.textMuted,
                    fontSize: 13,
                  }}
                >
                  No services match the filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface ActionButtonsProps {
  service: Service;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionButtons({
  service,
  isBusy,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
}: ActionButtonsProps) {
  const isRunning = service.status === "running" || service.status === "unhealthy";
  const isStopped = service.status === "stopped" || service.status === "crashed";
  const isTransitioning = service.status === "starting" || service.status === "restarting";

  return (
    <div
      style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
      onClick={(e) => e.stopPropagation()}
    >
      {isStopped && (
        <ActionButton onClick={onStart} disabled={isBusy} color={colors.success}>
          Start
        </ActionButton>
      )}
      {isRunning && (
        <>
          <ActionButton onClick={onRestart} disabled={isBusy} color={colors.warning}>
            Restart
          </ActionButton>
          <ActionButton onClick={onStop} disabled={isBusy} color={colors.danger}>
            Stop
          </ActionButton>
        </>
      )}
      {isTransitioning && (
        <span style={{ padding: "5px 8px", color: colors.textMuted, fontSize: 11 }}>...</span>
      )}
      <ActionButton onClick={onEdit} disabled={false} color={colors.textSecondary}>
        Edit
      </ActionButton>
      <ActionButton onClick={onDelete} disabled={isBusy} color={colors.danger}>
        Del
      </ActionButton>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "4px 8px",
        backgroundColor: hovered && !disabled ? colors.overlay : "transparent",
        border: `1px solid ${hovered && !disabled ? colors.textMuted : colors.border}`,
        borderRadius: radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? colors.textMuted : color,
        fontSize: 11,
        fontFamily: fonts.mono,
        fontWeight: 400,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
        textTransform: "lowercase",
      }}
    >
      {children}
    </button>
  );
}
