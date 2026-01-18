import { useState, useEffect, useRef } from "react";
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
import type { Modifier } from "@dnd-kit/core";

function createRestrictToContainer(containerRef: React.RefObject<HTMLDivElement | null>): Modifier {
  return ({ transform, draggingNodeRect }) => {
    if (!draggingNodeRect || !containerRef.current) return transform;

    const container = containerRef.current.getBoundingClientRect();

    return {
      ...transform,
      x: Math.min(
        Math.max(transform.x, container.left - draggingNodeRect.left),
        container.right - draggingNodeRect.right
      ),
      y: Math.min(
        Math.max(transform.y, container.top - draggingNodeRect.top),
        container.bottom - draggingNodeRect.bottom
      ),
    };
  };
}
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
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { TicketDetailContent } from "./TicketDetail.tsx";
import { TicketFormContent } from "./TicketForm.tsx";
import { colors, fonts, buttonPrimary, radius } from "../theme.ts";

const mobileBreakpoint = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < mobileBreakpoint
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

// Valid status transitions: source status -> allowed target columns
const validTransitions: Record<string, ColumnId[]> = {
  in_progress: ["ready", "closed"], // can unstart or close
  open: ["in_progress", "closed"], // "ready" tickets have status "open"
  closed: ["ready", "in_progress"],
};

function getSourceStatus(ticket: Ticket): string {
  return ticket.status;
}

function isValidTransition(sourceStatus: string, targetColumn: ColumnId, allowSame = false): boolean {
  // Can't drop on blocked - that's controlled by dependencies
  if (targetColumn === "blocked") return false;

  // Allow dropping back to same column (cancel action)
  if (allowSame) {
    if (sourceStatus === "in_progress" && targetColumn === "in_progress") return true;
    if (sourceStatus === "open" && targetColumn === "ready") return true;
    if (sourceStatus === "closed" && targetColumn === "closed") return true;
  }

  const allowed = validTransitions[sourceStatus];
  if (!allowed) return false;

  // Map "ready" column to valid targets for "open" status
  return allowed.includes(targetColumn);
}

// Column order for swipe navigation (excluding blocked)
const swipeColumns: ColumnId[] = ["in_progress", "ready", "closed"];

export function KanbanBoard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: allTickets } = useAllTickets(projectId!);
  const { data: readyTickets } = useReadyTickets(projectId!);
  const { data: blockedTickets } = useBlockedTickets(projectId!);
  const { data: closedTickets } = useClosedTickets(projectId!);
  const { start, close, reopen } = useTicketMutations(projectId!);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  const [droppedTicketId, setDroppedTicketId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ColumnId>("in_progress");
  const boardRef = useRef<HTMLDivElement>(null);
  const restrictToBoard = createRestrictToContainer(boardRef);


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
    setSelectedTicketId(ticketId);
  };

  const handleClosePanel = () => {
    setSelectedTicketId(null);
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
    return isValidTransition(getSourceStatus(activeTicket), columnId, true);
  };

  // Handle swipe on mobile - direction: -1 for left, 1 for right
  const handleSwipe = (ticket: Ticket, direction: -1 | 1) => {
    const sourceStatus = getSourceStatus(ticket);

    // Map status to swipe column index
    const currentIndex = sourceStatus === "open"
      ? swipeColumns.indexOf("ready")
      : swipeColumns.indexOf(sourceStatus as ColumnId);

    if (currentIndex === -1) return; // Blocked tickets can't be swiped

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= swipeColumns.length) return;

    const targetColumn = swipeColumns[targetIndex];
    if (!isValidTransition(sourceStatus, targetColumn)) return;

    // Hide ticket immediately
    setDroppedTicketId(ticket.id);
    setTimeout(() => setDroppedTicketId(null), 500);

    // Execute the action
    if (targetColumn === "in_progress") {
      if (sourceStatus === "closed") {
        reopen(ticket.id);
        setTimeout(() => start(ticket.id), 100);
      } else {
        start(ticket.id);
      }
    } else if (targetColumn === "closed") {
      close(ticket.id);
    } else if (targetColumn === "ready") {
      reopen(ticket.id);
    }
  };

  // Get tickets for the active tab
  const getTicketsForTab = (tab: ColumnId): Ticket[] => {
    switch (tab) {
      case "in_progress":
        return inProgressTickets;
      case "ready":
        return readyOpenTickets;
      case "blocked":
        return filteredBlockedTickets;
      case "closed":
        return filteredClosedTickets;
      default:
        return [];
    }
  };

  const tabLabels: Record<ColumnId, string> = {
    in_progress: "Active",
    ready: "Ready",
    blocked: "Blocked",
    closed: "Done",
  };

  const allTabs: ColumnId[] = ["in_progress", "ready", "blocked", "closed"];

  // Mobile view with tabs
  if (isMobile) {
    return (
      <div style={{ padding: 16, overflowX: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            minHeight: 32,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 600,
              color: colors.textPrimary,
              flexShrink: 0,
            }}
          >
            Board
          </h1>
          <button
            onClick={() => setShowNewTicketForm(true)}
            style={{ ...buttonPrimary, padding: "6px 12px", fontSize: 13, flexShrink: 0 }}
          >
            + New
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            marginBottom: 16,
            minHeight: 36,
          }}
        >
          {allTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: "8px 4px",
                fontSize: 12,
                fontWeight: 500,
                border: "none",
                borderRadius: radius.sm,
                cursor: "pointer",
                backgroundColor:
                  activeTab === tab ? colors.overlay : "transparent",
                color:
                  activeTab === tab ? colors.textPrimary : colors.textSecondary,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {tabLabels[tab]} ({getTicketsForTab(tab).length})
            </button>
          ))}
        </div>

        {/* Ticket list */}
        <div style={{ overflow: "hidden" }}>
          {getTicketsForTab(activeTab).length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: colors.textMuted,
              }}
            >
              No tickets
            </div>
          ) : (
            getTicketsForTab(activeTab).map((ticket) => (
              <SwipeableTicketCard
                key={ticket.id}
                ticket={ticket}
                onClick={() => handleTicketClick(ticket.id)}
                onSwipe={(dir) => handleSwipe(ticket, dir)}
                canSwipeLeft={
                  activeTab !== "blocked" &&
                  (activeTab === "ready" || activeTab === "closed")
                }
                canSwipeRight={
                  activeTab !== "blocked" &&
                  (activeTab === "in_progress" || activeTab === "ready")
                }
                leftLabel={activeTab === "ready" ? "In Progress" : activeTab === "closed" ? "Ready" : undefined}
                rightLabel={activeTab === "in_progress" ? "Ready" : activeTab === "ready" ? "Closed" : undefined}
              />
            ))
          )}
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

        <SlideOutPanel
          open={showNewTicketForm}
          onClose={() => setShowNewTicketForm(false)}
        >
          <TicketFormContent
            projectId={projectId!}
            onSuccess={() => setShowNewTicketForm(false)}
            onCancel={() => setShowNewTicketForm(false)}
          />
        </SlideOutPanel>
      </div>
    );
  }

  // Desktop view with columns
  return (
    <div style={{ padding: 24, overflowX: "hidden" }}>
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
          Board
        </h1>
        <button
          onClick={() => setShowNewTicketForm(true)}
          style={buttonPrimary}
        >
          + New Ticket
        </button>
      </div>

      <DndContext
        sensors={sensors}
        modifiers={[restrictToBoard]}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={boardRef}
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
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("in_progress")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="ready"
            title="Ready"
            tickets={readyOpenTickets}
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("ready")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="blocked"
            title="Blocked"
            tickets={filteredBlockedTickets}
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("blocked")}
            isDragging={!!activeTicket}
          />
          <KanbanColumn
            id="closed"
            title="Closed"
            tickets={filteredClosedTickets}
            color={colors.textMuted}
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

// Swipeable card for mobile
interface SwipeableTicketCardProps {
  ticket: Ticket;
  onClick: () => void;
  onSwipe: (direction: -1 | 1) => void;
  canSwipeLeft: boolean;
  canSwipeRight: boolean;
  leftLabel?: string;
  rightLabel?: string;
}

function SwipeableTicketCard({
  ticket,
  onClick,
  onSwipe,
  canSwipeLeft,
  canSwipeRight,
  leftLabel,
  rightLabel,
}: SwipeableTicketCardProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const offsetXRef = useRef(0);

  const getSwipeThreshold = () => {
    const cardWidth = cardRef.current?.offsetWidth ?? 300;
    return cardWidth * 0.75;
  };

  // Keep offsetX ref in sync for use in event handlers
  useEffect(() => {
    offsetXRef.current = offsetX;
  }, [offsetX]);

  // Add non-passive touch listeners
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleTouchStart = (e: TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      isHorizontalSwipe.current = null;
      setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX.current;
      const diffY = currentY - startY.current;

      // Determine swipe direction on first significant movement
      if (isHorizontalSwipe.current === null) {
        if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
          isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
        }
      }

      // Only handle horizontal swipes
      if (isHorizontalSwipe.current) {
        e.preventDefault();
        // Clamp swipe based on what's allowed
        let clampedX = diffX;
        if (!canSwipeLeft && diffX < 0) clampedX = 0;
        if (!canSwipeRight && diffX > 0) clampedX = 0;
        setOffsetX(clampedX);
      }
    };

    const handleTouchEnd = () => {
      if (Math.abs(offsetXRef.current) > getSwipeThreshold()) {
        const direction = offsetXRef.current > 0 ? 1 : -1;
        if ((direction === -1 && canSwipeLeft) || (direction === 1 && canSwipeRight)) {
          onSwipe(direction);
        }
      }
      setOffsetX(0);
      setIsSwiping(false);
      isHorizontalSwipe.current = null;
    };

    card.addEventListener("touchstart", handleTouchStart, { passive: true });
    card.addEventListener("touchmove", handleTouchMove, { passive: false });
    card.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      card.removeEventListener("touchstart", handleTouchStart);
      card.removeEventListener("touchmove", handleTouchMove);
      card.removeEventListener("touchend", handleTouchEnd);
    };
  }, [canSwipeLeft, canSwipeRight, onSwipe]);

  const getSwipeIndicator = () => {
    if (Math.abs(offsetX) < 30) return null;
    if (offsetX < 0 && canSwipeLeft && leftLabel) {
      return { text: `← ${leftLabel}`, side: "left" as const };
    }
    if (offsetX > 0 && canSwipeRight && rightLabel) {
      return { text: `${rightLabel} →`, side: "right" as const };
    }
    return null;
  };

  const indicator = getSwipeIndicator();

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        marginBottom: 8,
      }}
    >
      {/* Swipe indicator background */}
      {indicator && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: indicator.side === "left" ? "auto" : 0,
            right: indicator.side === "right" ? "auto" : 0,
            width: Math.abs(offsetX),
            backgroundColor:
              indicator.side === "left" ? colors.accentEmphasis : colors.successEmphasis,
            display: "flex",
            alignItems: "center",
            justifyContent: indicator.side === "left" ? "flex-end" : "flex-start",
            padding: "0 12px",
            color: colors.textPrimary,
            fontSize: 12,
            fontWeight: 500,
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          {indicator.text}
        </div>
      )}

      {/* Card */}
      <div
        ref={cardRef}
        onClick={() => {
          if (!isSwiping && Math.abs(offsetX) < 5) {
            onClick();
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? "none" : "transform 0.2s ease-out",
        }}
      >
        <TicketCard ticket={ticket} isDragDisabled />
      </div>
    </div>
  );
}
