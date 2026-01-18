import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, typeColors, priorityColors } from "../theme.ts";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragDisabled?: boolean;
}

export function TicketCard({
  ticket,
  onClick,
  isDragDisabled,
}: TicketCardProps) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: ticket.id,
      data: { ticket },
      disabled: isDragDisabled,
    });

  const style = {
    borderTop: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderRight: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderBottom: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderLeft: `3px solid ${priorityColors[ticket.priority] ?? colors.textMuted}`,
    borderRadius: radius.md,
    marginBottom: "8px",
    backgroundColor: hovered ? colors.overlay : colors.surfaceRaised,
    cursor: isDragDisabled ? (onClick ? "pointer" : "default") : "grab",
    fontFamily: fonts.sans,
    transition: isDragging ? undefined : "background-color 0.15s",
    overflow: "hidden" as const,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={style}
      {...listeners}
      {...attributes}
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
      </div>
    </div>
  );
}
