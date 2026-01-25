import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useAllTickets, type Ticket } from "../hooks/useTickets.ts";
import { TicketDetailContent } from "./TicketDetail.tsx";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { TicketFormContent } from "./TicketForm.tsx";
import { colors, fonts, radius, buttonPrimary, buttonSecondary, priorityColors, typeColors } from "../theme.ts";

type SortField = "id" | "title" | "type" | "priority" | "status" | "assignee" | "created";
type SortDirection = "asc" | "desc";

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

const statusOrder: Record<string, number> = {
  in_progress: 0,
  open: 1,
  closed: 2,
};

export function TableView() {
  const { id: projectId } = useParams<{ id: string }>();
  const { data: tickets } = useAllTickets(projectId!);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [sort, setSort] = useState<SortConfig>({ field: "priority", direction: "asc" });

  const sortedTickets = useMemo(() => {
    if (!tickets) return [];

    return [...tickets].sort((a, b) => {
      const dir = sort.direction === "asc" ? 1 : -1;

      switch (sort.field) {
        case "id":
          return dir * a.id.localeCompare(b.id);
        case "title":
          return dir * (a.title ?? "").localeCompare(b.title ?? "");
        case "type":
          return dir * a.type.localeCompare(b.type);
        case "priority":
          return dir * (a.priority - b.priority);
        case "status":
          return dir * ((statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99));
        case "assignee":
          return dir * (a.assignee ?? "").localeCompare(b.assignee ?? "");
        case "created":
          return dir * a.created.localeCompare(b.created);
        default:
          return 0;
      }
    });
  }, [tickets, sort]);

  const handleSort = (field: SortField) => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleRowClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
  };

  const handleClosePanel = () => {
    setSelectedTicketId(null);
  };

  const getSortIndicator = (field: SortField) => {
    if (sort.field !== field) return null;
    return sort.direction === "asc" ? " ▲" : " ▼";
  };

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Table
        </h1>
        <button
          onClick={() => setShowNewTicketForm(true)}
          style={buttonPrimary}
        >
          + New Ticket
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: fonts.sans,
            fontSize: 13,
            tableLayout: "fixed",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: colors.surfaceRaised }}>
              <HeaderCell field="id" label="ID" sort={sort} onSort={handleSort} width={90} />
              <HeaderCell field="title" label="Title" sort={sort} onSort={handleSort} />
              <HeaderCell field="type" label="Type" sort={sort} onSort={handleSort} width={80} />
              <HeaderCell field="priority" label="Pri" sort={sort} onSort={handleSort} width={50} />
              <HeaderCell field="status" label="Status" sort={sort} onSort={handleSort} width={100} />
              <HeaderCell field="assignee" label="Assignee" sort={sort} onSort={handleSort} width={140} />
            </tr>
          </thead>
          <tbody>
            {sortedTickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicketId === ticket.id}
                onClick={() => handleRowClick(ticket.id)}
              />
            ))}
            {sortedTickets.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: 32,
                    textAlign: "center",
                    color: colors.textMuted,
                  }}
                >
                  No tickets
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SlideOutPanel open={!!selectedTicketId} onClose={handleClosePanel}>
        {selectedTicketId && (
          <TicketDetailContent
            projectId={projectId!}
            ticketId={selectedTicketId}
            onTicketClick={setSelectedTicketId}
          />
        )}
      </SlideOutPanel>

      <SlideOutPanel open={showNewTicketForm} onClose={() => setShowNewTicketForm(false)}>
        <TicketFormContent
          projectId={projectId!}
          onSuccess={() => setShowNewTicketForm(false)}
          onCancel={() => setShowNewTicketForm(false)}
        />
      </SlideOutPanel>
    </div>
  );
}

function HeaderCell({
  field,
  label,
  sort,
  onSort,
  width,
}: {
  field: SortField;
  label: string;
  sort: SortConfig;
  onSort: (field: SortField) => void;
  width?: number;
}) {
  const isActive = sort.field === field;

  return (
    <th
      onClick={() => onSort(field)}
      style={{
        padding: "10px 12px",
        textAlign: "left",
        fontWeight: 600,
        color: isActive ? colors.textPrimary : colors.textSecondary,
        borderBottom: `1px solid ${colors.border}`,
        cursor: "pointer",
        userSelect: "none",
        width: width,
        whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{ color: colors.accent, fontSize: 10 }}>
        {isActive && (sort.direction === "asc" ? " ▲" : " ▼")}
      </span>
    </th>
  );
}

function TableRow({
  ticket,
  isSelected,
  onClick,
}: {
  ticket: Ticket;
  isSelected: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const statusDisplay: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: colors.textSecondary },
    in_progress: { label: "In Progress", color: colors.accent },
    closed: { label: "Closed", color: colors.textMuted },
  };

  const status = statusDisplay[ticket.status] ?? { label: ticket.status, color: colors.textMuted };

  return (
    <tr
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isSelected
          ? colors.overlay
          : hovered
            ? colors.surfaceRaised
            : "transparent",
        cursor: "pointer",
        borderLeft: isSelected ? `3px solid ${colors.accent}` : "3px solid transparent",
      }}
    >
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          fontFamily: fonts.mono,
          fontSize: 11,
          color: colors.textMuted,
        }}
      >
        {ticket.id}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          color: colors.textPrimary,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {ticket.title || "(no title)"}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          color: typeColors[ticket.type] ?? colors.textMuted,
          fontSize: 11,
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {ticket.type}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          color: priorityColors[ticket.priority] ?? colors.textMuted,
          fontWeight: 600,
        }}
      >
        P{ticket.priority}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          color: status.color,
        }}
      >
        {status.label}
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: `1px solid ${colors.borderMuted}`,
          color: colors.textSecondary,
          maxWidth: 140,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {ticket.assignee || "-"}
      </td>
    </tr>
  );
}
