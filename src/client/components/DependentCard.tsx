import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, typeColors, priorityColors } from "../theme.ts";

export type RelationshipType = "parent" | "dependency";

interface DependentCardProps {
  ticket: Ticket;
  parentId: string;
  relationshipType?: RelationshipType;
  onClick?: () => void;
  isDragDisabled?: boolean;
}

export function DependentCard({
  ticket,
  parentId,
  relationshipType = "dependency",
  onClick,
  isDragDisabled,
}: DependentCardProps) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `dep-${ticket.id}`,
      data: { ticket, isDependent: true, parentId, relationshipType },
      disabled: isDragDisabled,
    });

  const style = {
    marginLeft: "16px",
    borderTop: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderRight: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderBottom: `1px solid ${hovered ? colors.accent : colors.borderMuted}`,
    borderLeft: `3px solid ${priorityColors[ticket.priority] ?? colors.textMuted}`,
    borderRadius: radius.md,
    marginBottom: "8px",
    backgroundColor: hovered ? colors.overlay : colors.surface,
    cursor: isDragDisabled ? (onClick ? "pointer" : "default") : "grab",
    fontFamily: fonts.sans,
    transition: isDragging ? undefined : "background-color 0.15s",
    overflow: "hidden" as const,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 0.85,
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
          padding: "4px 8px",
          backgroundColor: colors.canvas,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ color: colors.textMuted, fontSize: "10px", fontFamily: fonts.mono, flex: 1 }}>
          {ticket.id}
        </span>
        <span
          style={{
            color: typeColors[ticket.type] ?? colors.textMuted,
            fontSize: "9px",
            textTransform: "uppercase",
            fontWeight: 600,
            letterSpacing: "0.5px",
            flex: 1,
            textAlign: "center",
          }}
        >
          {ticket.type}
        </span>
        <span
          style={{
            color: priorityColors[ticket.priority] ?? colors.textMuted,
            fontSize: "10px",
            fontWeight: 600,
            flex: 1,
            textAlign: "right",
          }}
        >
          P{ticket.priority}
        </span>
      </div>

      <div style={{ padding: "6px 8px" }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: "13px",
            color: colors.textSecondary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ticket.title || "(no title)"}
        </div>
      </div>
    </div>
  );
}
