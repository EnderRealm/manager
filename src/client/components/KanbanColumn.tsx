import { useDroppable } from "@dnd-kit/core";
import type { Ticket } from "../hooks/useTickets.ts";
import { TicketCard } from "./TicketCard.tsx";
import { colors, fonts, radius } from "../theme.ts";

export type ColumnId = "in_progress" | "ready" | "blocked" | "closed";

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  tickets: Ticket[];
  color: string;
  onStart?: (id: string) => void;
  onClose?: (id: string) => void;
  onReopen?: (id: string) => void;
  onTicketClick?: (id: string) => void;
  isValidDrop?: boolean;
  isDragging?: boolean;
}

export function KanbanColumn({
  id,
  title,
  tickets,
  color,
  onStart,
  onClose,
  onReopen,
  onTicketClick,
  isValidDrop,
  isDragging,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const showValidHighlight = isDragging && isOver && isValidDrop;
  const showInvalidHighlight = isDragging && isOver && !isValidDrop;

  let borderColor = colors.borderMuted;
  if (showValidHighlight) {
    borderColor = colors.success;
  } else if (showInvalidHighlight) {
    borderColor = colors.danger;
  } else if (isDragging && isValidDrop) {
    borderColor = colors.border;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        flex: 1,
        minWidth: "280px",
        borderRadius: radius.lg,
        padding: "12px",
        border: `2px solid ${borderColor}`,
        transition: "border-color 0.15s, background-color 0.15s",
        backgroundColor: showValidHighlight
          ? `${colors.success}10`
          : showInvalidHighlight
            ? `${colors.danger}08`
            : colors.canvas,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3
          style={{
            margin: 0,
            color,
            fontFamily: fonts.sans,
            fontSize: "14px",
            fontWeight: 600,
          }}
        >
          {title}
        </h3>
        <span
          style={{
            backgroundColor: color,
            color: colors.canvas,
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {tickets.length}
        </span>
      </div>
      <div>
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onStart={onStart ? () => onStart(ticket.id) : undefined}
            onClose={onClose ? () => onClose(ticket.id) : undefined}
            onReopen={onReopen ? () => onReopen(ticket.id) : undefined}
            onClick={onTicketClick ? () => onTicketClick(ticket.id) : undefined}
          />
        ))}
        {tickets.length === 0 && (
          <div
            style={{
              color: colors.textMuted,
              textAlign: "center",
              padding: "20px",
              fontSize: "14px",
            }}
          >
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}
