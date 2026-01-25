import { useState, useCallback } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, typeColors, priorityColors } from "../theme.ts";

export type DropMode = "parent" | "dependency";

interface TicketCardProps {
  ticket: Ticket;
  onClick?: () => void;
  isDragDisabled?: boolean;
  isDropTarget?: boolean;
  isValidDropTarget?: boolean;
  dropMode?: DropMode;
}

export function TicketCard({
  ticket,
  onClick,
  isDragDisabled,
  isDropTarget = false,
  isValidDropTarget = false,
  dropMode = "parent",
}: TicketCardProps) {
  const [hovered, setHovered] = useState(false);

  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } =
    useDraggable({
      id: ticket.id,
      data: { ticket },
      disabled: isDragDisabled,
    });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `card-${ticket.id}`,
    data: { ticket, isCard: true },
    disabled: !isDropTarget,
  });

  // Combine refs
  const setNodeRef = useCallback(
    (node: HTMLDivElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef]
  );

  const showDropHighlight = isDropTarget && isOver && isValidDropTarget;
  const showInvalidHighlight = isDropTarget && isOver && !isValidDropTarget;

  // Determine border colors
  let borderColor = hovered ? colors.accent : colors.borderMuted;
  if (showDropHighlight) {
    borderColor = colors.success;
  } else if (showInvalidHighlight) {
    borderColor = colors.danger;
  }

  const style = {
    borderTop: `1px solid ${borderColor}`,
    borderRight: `1px solid ${borderColor}`,
    borderBottom: `1px solid ${borderColor}`,
    borderLeft: `3px solid ${priorityColors[ticket.priority] ?? colors.textMuted}`,
    borderRadius: radius.md,
    marginBottom: "8px",
    backgroundColor: showDropHighlight
      ? `${colors.success}15`
      : showInvalidHighlight
        ? `${colors.danger}10`
        : hovered
          ? colors.overlay
          : colors.surfaceRaised,
    cursor: isDragDisabled ? (onClick ? "pointer" : "default") : "grab",
    fontFamily: fonts.sans,
    transition: isDragging ? undefined : "background-color 0.15s, border-color 0.15s",
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
      {/* Drop mode label */}
      {showDropHighlight && (
        <div
          style={{
            padding: "6px 10px",
            backgroundColor: dropMode === "dependency" ? colors.warning : colors.success,
            color: colors.canvas,
            fontSize: "11px",
            fontWeight: 600,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {dropMode === "dependency" ? "Add Blocker" : "Set Parent"}
        </div>
      )}

      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontWeight: 500, color: colors.textPrimary }}>
          {ticket.title || "(no title)"}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "6px 10px",
          backgroundColor: colors.canvas,
          borderTop: `1px solid ${colors.border}`,
        }}
      >
        <span style={{ color: colors.textMuted, fontSize: "11px", fontFamily: fonts.mono, flex: 1 }}>
          {ticket.id}
        </span>
        <span
          style={{
            color: typeColors[ticket.type] ?? colors.textMuted,
            fontSize: "10px",
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
            fontSize: "11px",
            fontWeight: 600,
            flex: 1,
            textAlign: "right",
          }}
        >
          P{ticket.priority}
        </span>
      </div>
    </div>
  );
}
