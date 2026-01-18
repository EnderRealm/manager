import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  useAllTickets,
  useReadyTickets,
  useBlockedTickets,
  useClosedTickets,
  useTicketMutations,
  type Ticket,
} from "../hooks/useTickets.ts";
import { KanbanColumn, type ColumnId } from "./KanbanColumn.tsx";
import { TicketCard } from "./TicketCard.tsx";
import { colors, fonts, buttonSecondary, buttonPrimary } from "../theme.ts";

// Valid status transitions: source status -> allowed target columns
const validTransitions: Record<string, ColumnId[]> = {
  in_progress: ["ready", "closed"], // can unstart or close
  open: ["in_progress", "closed"], // "ready" tickets have status "open"
  closed: ["ready", "in_progress"],
};

function getSourceStatus(ticket: Ticket): string {
  return ticket.status;
}

function isValidTransition(sourceStatus: string, targetColumn: ColumnId): boolean {
  // Can't drop on blocked - that's controlled by dependencies
  if (targetColumn === "blocked") return false;

  const allowed = validTransitions[sourceStatus];
  if (!allowed) return false;

  // Map "ready" column to valid targets for "open" status
  return allowed.includes(targetColumn);
}

export function KanbanBoard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: allTickets } = useAllTickets(projectId!);
  const { data: readyTickets } = useReadyTickets(projectId!);
  const { data: blockedTickets } = useBlockedTickets(projectId!);
  const { data: closedTickets } = useClosedTickets(projectId!);
  const { start, close, reopen } = useTicketMutations(projectId!);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  const [droppedTicketId, setDroppedTicketId] = useState<string | null>(null);


  // Filter out tickets that were just dropped (waiting for refetch)
  // Don't filter activeTicket - it needs to stay in DOM for useDraggable to work
  const filterHidden = (tickets: Ticket[]) =>
    tickets.filter((t) => t.id !== droppedTicketId);

  const inProgressTickets = filterHidden(
    allTickets?.filter((t) => t.status === "in_progress") ?? []
  );

  // Filter ready to only show open tickets (exclude in_progress which appear in their own column)
  const readyOpenTickets = filterHidden(
    readyTickets?.filter((t) => t.status === "open") ?? []
  );

  const filteredBlockedTickets = filterHidden(blockedTickets ?? []);
  const filteredClosedTickets = filterHidden(closedTickets ?? []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    })
  );

  const handleTicketClick = (ticketId: string) => {
    navigate(`/projects/${projectId}/tickets/${ticketId}`);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = event.active.data.current?.ticket as Ticket | undefined;
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as ColumnId | undefined;
    setOverColumn(overId ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTicket(null);
    setOverColumn(null);

    if (!over) return;

    const ticket = active.data.current?.ticket as Ticket | undefined;
    if (!ticket) return;

    const targetColumn = over.id as ColumnId;
    const sourceStatus = getSourceStatus(ticket);

    if (!isValidTransition(sourceStatus, targetColumn)) return;

    // Hide the ticket immediately, clear after refetch has time to complete
    setDroppedTicketId(ticket.id);
    setTimeout(() => setDroppedTicketId(null), 500);

    // Execute the appropriate action based on target column
    if (targetColumn === "in_progress") {
      if (sourceStatus === "closed") {
        // Reopen then start
        reopen(ticket.id);
        // Small delay to ensure reopen completes before start
        setTimeout(() => start(ticket.id), 100);
      } else {
        start(ticket.id);
      }
    } else if (targetColumn === "closed") {
      close(ticket.id);
    } else if (targetColumn === "ready") {
      // Both closed and in_progress use reopen to set status to open
      reopen(ticket.id);
    }
  };

  const handleDragCancel = () => {
    setActiveTicket(null);
    setOverColumn(null);
  };

  // Compute valid drop targets for the currently dragged ticket
  const getIsValidDrop = (columnId: ColumnId): boolean => {
    if (!activeTicket) return false;
    return isValidTransition(getSourceStatus(activeTicket), columnId);
  };

  return (
    <div style={{ padding: "24px", fontFamily: fonts.sans }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <button onClick={() => navigate("/")} style={buttonSecondary}>
          ← Back
        </button>
        <h1 style={{ margin: 0, color: colors.textPrimary }}>{projectId}</h1>
        <button
          onClick={() => navigate(`/projects/${projectId}/tickets/new`)}
          style={{ ...buttonPrimary, marginLeft: "auto" }}
        >
          + New Ticket
        </button>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
          }}
        >
          <KanbanColumn
            id="in_progress"
            title="In Progress"
            tickets={inProgressTickets}
            color={colors.warning}
            onClose={close}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("in_progress")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="ready"
            title="Ready"
            tickets={readyOpenTickets}
            color={colors.success}
            onStart={start}
            onClose={close}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("ready")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="blocked"
            title="Blocked"
            tickets={filteredBlockedTickets}
            color={colors.danger}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("blocked")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="closed"
            title="Closed"
            tickets={filteredClosedTickets}
            color={colors.textMuted}
            onReopen={reopen}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("closed")}
            isDragging={!!activeTicket}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTicket && (
            <TicketCard ticket={activeTicket} isDragDisabled />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
