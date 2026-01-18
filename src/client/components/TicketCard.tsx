import { useState } from "react";
import type { Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, typeColors, priorityColors } from "../theme.ts";

interface TicketCardProps {
  ticket: Ticket;
  onStart?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onClick?: () => void;
}

export function TicketCard({
  ticket,
  onStart,
  onClose,
  onReopen,
  onClick,
}: TicketCardProps) {
  const [hovered, setHovered] = useState(false);

  const actionButtonStyle = {
    padding: "4px 10px",
    fontSize: "12px",
    color: colors.textPrimary,
    backgroundColor: colors.overlay,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    cursor: "pointer",
    fontWeight: 500,
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderTop: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
        borderRight: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
        borderBottom: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
        borderLeft: `3px solid ${priorityColors[ticket.priority] ?? colors.textMuted}`,
        borderRadius: radius.md,
        marginBottom: "8px",
        backgroundColor: hovered ? colors.overlay : colors.surfaceRaised,
        cursor: onClick ? "pointer" : "default",
        fontFamily: fonts.sans,
        transition: "background-color 0.15s",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          backgroundColor: colors.canvas,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ color: colors.textMuted, fontSize: "11px", fontFamily: fonts.mono }}>
          {ticket.id}
        </span>
        <span
          style={{
            color: typeColors[ticket.type] ?? colors.textMuted,
            fontSize: "10px",
            textTransform: "uppercase",
            fontWeight: 600,
            letterSpacing: "0.5px",
          }}
        >
          {ticket.type}
        </span>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 500, color: colors.textPrimary }}>
          {ticket.title || "(no title)"}
        </div>

        {(onStart || onClose || onReopen) && (
          <div
            style={{ marginTop: "10px", display: "flex", gap: "8px" }}
            onClick={(e) => e.stopPropagation()}
          >
            {onStart && ticket.status === "open" && (
              <button onClick={onStart} style={actionButtonStyle}>
                Start
              </button>
            )}
            {onClose && (ticket.status === "open" || ticket.status === "in_progress") && (
              <button onClick={onClose} style={actionButtonStyle}>
                Close
              </button>
            )}
            {onReopen && ticket.status === "closed" && (
              <button onClick={onReopen} style={actionButtonStyle}>
                Reopen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
