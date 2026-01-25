import { useDroppable } from "@dnd-kit/core";
import type { Ticket } from "../hooks/useTickets.ts";
import { TicketCard } from "./TicketCard.tsx";
import { DependentCard, type RelationshipType } from "./DependentCard.tsx";
import { colors, fonts, radius } from "../theme.ts";

export type ColumnId = "in_progress" | "ready" | "blocked" | "closed";
export type DropMode = "parent" | "dependency";

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  tickets: Ticket[];
  color: string;
  onTicketClick?: (id: string) => void;
  isValidDrop?: boolean;
  isDragging?: boolean;
  dependencyMap?: Map<string, Ticket[]>;
  showDependents?: boolean;
  getIsValidCardDrop?: (cardId: string) => boolean;
  dropMode?: DropMode;
}

export function KanbanColumn({
  id,
  title,
  tickets,
  color,
  onTicketClick,
  isValidDrop,
  isDragging,
  dependencyMap,
  showDependents = false,
  getIsValidCardDrop,
  dropMode = "parent",
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
        minHeight: 0,
        borderRadius: radius.lg,
        padding: "12px",
        border: `2px solid ${borderColor}`,
        transition: "border-color 0.15s, background-color 0.15s",
        backgroundColor: showValidHighlight
          ? `${colors.success}10`
          : showInvalidHighlight
            ? `${colors.danger}08`
            : colors.canvas,
        display: "flex",
        flexDirection: "column",
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
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {tickets.map((ticket) => {
          const dependents = showDependents && dependencyMap ? dependencyMap.get(ticket.id) || [] : [];
          const isValidCardTarget = isDragging && getIsValidCardDrop ? getIsValidCardDrop(ticket.id) : false;
          return (
            <div key={ticket.id}>
              <TicketCard
                ticket={ticket}
                onClick={onTicketClick ? () => onTicketClick(ticket.id) : undefined}
                isDropTarget={!!isDragging}
                isValidDropTarget={isValidCardTarget}
                dropMode={dropMode}
              />
              {dependents.map((dep) => {
                // Determine relationship: parent-child or dependency
                const relationshipType: RelationshipType =
                  dep.parent === ticket.id ? "parent" : "dependency";
                return (
                  <DependentCard
                    key={dep.id}
                    ticket={dep}
                    parentId={ticket.id}
                    relationshipType={relationshipType}
                    onClick={onTicketClick ? () => onTicketClick(dep.id) : undefined}
                  />
                );
              })}
            </div>
          );
        })}
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
