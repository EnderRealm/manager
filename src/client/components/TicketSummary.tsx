import { Link } from "react-router-dom";
import type { Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, priorityColors, statusColors } from "../theme.ts";

interface TicketSummaryProps {
  ticket: Ticket;
  projectId: string;
  onClick?: (e: React.MouseEvent) => void;
  showStatus?: boolean;
  showPriority?: boolean;
  showType?: boolean;
  maxTitleWidth?: number;
}

const typeAbbrev: Record<string, string> = {
  epic: "E",
  feature: "F",
  task: "T",
  bug: "B",
  chore: "C",
};

const statusIndicator: Record<string, { color: string; symbol: string }> = {
  open: { color: colors.textMuted, symbol: "○" },
  in_progress: { color: colors.accent, symbol: "◐" },
  blocked: { color: colors.warning, symbol: "⊘" },
  closed: { color: colors.success, symbol: "●" },
};

const defaultStatus = { color: colors.textMuted, symbol: "○" };

export function TicketSummary({
  ticket,
  projectId,
  onClick,
  showStatus = true,
  showPriority = true,
  showType = true,
  maxTitleWidth = 200,
}: TicketSummaryProps) {
  const status = statusIndicator[ticket.status] ?? defaultStatus;
  const priorityColor = priorityColors[ticket.priority] || colors.textMuted;
  const typeLabel = typeAbbrev[ticket.type] || "?";

  return (
    <Link
      to={`/projects/${projectId}/tickets/${ticket.id}`}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        backgroundColor: colors.overlay,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        textDecoration: "none",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {/* Status indicator */}
      {showStatus && (
        <span style={{ color: status.color, fontSize: 10 }} title={ticket.status}>
          {status.symbol}
        </span>
      )}

      {/* Priority */}
      {showPriority && (
        <span
          style={{
            color: priorityColor,
            fontWeight: 600,
            fontSize: 10,
            minWidth: 16,
          }}
          title={`Priority ${ticket.priority}`}
        >
          P{ticket.priority}
        </span>
      )}

      {/* Type badge */}
      {showType && (
        <span
          style={{
            backgroundColor: colors.surface,
            color: colors.textMuted,
            padding: "1px 4px",
            borderRadius: 2,
            fontSize: 9,
            fontWeight: 600,
          }}
          title={ticket.type}
        >
          {typeLabel}
        </span>
      )}

      {/* Ticket ID */}
      <span
        style={{
          color: colors.accent,
          fontFamily: fonts.mono,
          fontSize: 11,
        }}
      >
        {ticket.id}
      </span>

      {/* Title */}
      <span
        style={{
          color: colors.textSecondary,
          fontFamily: fonts.sans,
          maxWidth: maxTitleWidth,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={ticket.title || undefined}
      >
        {ticket.title || "(no title)"}
      </span>
    </Link>
  );
}

// Minimal version for when we only have the ID
interface TicketSummaryByIdProps {
  ticketId: string;
  allTickets: Ticket[];
  projectId: string;
  onClick?: (e: React.MouseEvent) => void;
  showStatus?: boolean;
  showPriority?: boolean;
  showType?: boolean;
  maxTitleWidth?: number;
}

export function TicketSummaryById({
  ticketId,
  allTickets,
  projectId,
  onClick,
  ...props
}: TicketSummaryByIdProps) {
  const ticket = allTickets.find((t) => t.id === ticketId);

  if (!ticket) {
    // Fallback for unknown ticket
    return (
      <Link
        to={`/projects/${projectId}/tickets/${ticketId}`}
        onClick={onClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 8px",
          backgroundColor: colors.overlay,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          textDecoration: "none",
          fontSize: 12,
        }}
      >
        <span style={{ color: colors.textMuted, fontSize: 10 }}>?</span>
        <span
          style={{
            color: colors.accent,
            fontFamily: fonts.mono,
            fontSize: 11,
          }}
        >
          {ticketId}
        </span>
        <span style={{ color: colors.textMuted, fontStyle: "italic" }}>
          (not found)
        </span>
      </Link>
    );
  }

  return (
    <TicketSummary
      ticket={ticket}
      projectId={projectId}
      onClick={onClick}
      {...props}
    />
  );
}
