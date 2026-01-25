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
import { DependentCard, type RelationshipType } from "./DependentCard.tsx";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { TicketDetailContent } from "./TicketDetail.tsx";
import { TicketFormContent } from "./TicketForm.tsx";
import { colors, fonts, buttonPrimary, buttonSecondary, radius, inputBase } from "../theme.ts";

// Filter types
interface Filters {
  types: string[];
  priorities: number[];
  assignees: string[];
}

const TICKET_TYPES = ["bug", "feature", "task", "epic", "chore"] as const;
const PRIORITIES = [0, 1, 2, 3, 4] as const;

function FilterDropdown({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: (string | number)[];
  selected: (string | number)[];
  onChange: (selected: (string | number)[]) => void;
  renderOption?: (opt: string | number) => string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (opt: string | number) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const firstSelected = selected[0];
  const displayText = selected.length === 0
    ? label
    : selected.length === 1 && firstSelected !== undefined
      ? renderOption ? renderOption(firstSelected) : String(firstSelected)
      : `${selected.length} selected`;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...buttonSecondary,
          padding: "6px 12px",
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 6,
          minWidth: 80,
          backgroundColor: selected.length > 0 ? colors.overlay : "transparent",
        }}
      >
        {displayText}
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: 4,
            zIndex: 100,
            minWidth: 140,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {options.map((opt) => (
            <label
              key={String(opt)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 8px",
                cursor: "pointer",
                borderRadius: radius.sm,
                fontSize: 13,
                color: colors.textPrimary,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = colors.overlay;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggleOption(opt)}
                style={{ accentColor: colors.accent }}
              />
              {renderOption ? renderOption(opt) : String(opt)}
            </label>
          ))}
          {selected.length > 0 && (
            <button
              onClick={() => onChange([])}
              style={{
                width: "100%",
                padding: "6px 8px",
                marginTop: 4,
                border: "none",
                borderTop: `1px solid ${colors.border}`,
                backgroundColor: "transparent",
                color: colors.textSecondary,
                fontSize: 12,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

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
  const { start, close, reopen, addDep, removeDep, setParent, clearParent } = useTicketMutations(projectId!);

  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [activeRelationshipType, setActiveRelationshipType] = useState<RelationshipType | null>(null);
  const [activeParentId, setActiveParentId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnId | null>(null);
  const [overCardId, setOverCardId] = useState<string | null>(null);
  const [droppedTicketId, setDroppedTicketId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [activeTab, setActiveTab] = useState<ColumnId>("in_progress");
  const [filters, setFilters] = useState<Filters>({ types: [], priorities: [], assignees: [] });
  const [isShiftHeld, setIsShiftHeld] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const restrictToBoard = createRestrictToContainer(boardRef);

  // Track shift key for dependency mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftHeld(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Derive available assignees from ticket data
  const availableAssignees = [...new Set(
    (allTickets ?? [])
      .map((t) => t.assignee)
      .filter((a): a is string => !!a)
  )].sort();

  // Apply filters to a ticket list
  const applyFilters = (tickets: Ticket[]): Ticket[] => {
    return tickets.filter((t) => {
      if (filters.types.length > 0 && !filters.types.includes(t.type)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(t.priority)) return false;
      if (filters.assignees.length > 0) {
        if (!t.assignee || !filters.assignees.includes(t.assignee)) return false;
      }
      return true;
    });
  };

  const hasActiveFilters = filters.types.length > 0 || filters.priorities.length > 0 || filters.assignees.length > 0;

  const clearAllFilters = () => setFilters({ types: [], priorities: [], assignees: [] });

  // Filter out tickets that were just dropped (waiting for refetch)
  // Don't filter activeTicket - it needs to stay in DOM for useDraggable to work
  const filterHidden = (tickets: Ticket[]) =>
    tickets.filter((t) => t.id !== droppedTicketId);

  const inProgressTickets = applyFilters(filterHidden(
    allTickets?.filter((t) => t.status === "in_progress") ?? []
  ));

  // Filter ready to only show open tickets (exclude in_progress which appear in their own column)
  const readyOpenTickets = applyFilters(filterHidden(
    readyTickets?.filter((t) => t.status === "open") ?? []
  ));

  const filteredBlockedTickets = applyFilters(filterHidden(blockedTickets ?? []));
  const filteredClosedTickets = applyFilters(filterHidden(closedTickets ?? []));

  // Build dependency map: blockerId -> [tickets that depend on it]
  // Includes both deps (blocking) and parent-child relationships
  const dependencyMap = new Map<string, Ticket[]>();
  const allTicketsList = allTickets ?? [];

  for (const ticket of allTicketsList) {
    // Add blocking dependencies
    for (const blockerId of ticket.deps) {
      const existing = dependencyMap.get(blockerId) || [];
      existing.push(ticket);
      dependencyMap.set(blockerId, existing);
    }

    // Add parent-child relationship (show children under their parent)
    if (ticket.parent) {
      const existing = dependencyMap.get(ticket.parent) || [];
      // Avoid duplicates if ticket both depends on and is child of same parent
      if (!existing.some((t) => t.id === ticket.id)) {
        existing.push(ticket);
        dependencyMap.set(ticket.parent, existing);
      }
    }
  }

  // Get IDs of all tickets that are dependents (they'll be shown under their blockers)
  const dependentIds = new Set<string>();
  for (const deps of dependencyMap.values()) {
    for (const dep of deps) {
      dependentIds.add(dep.id);
    }
  }

  // Filter dependents out of top-level lists (except Blocked column which stays flat)
  const filterDependents = (tickets: Ticket[]) =>
    tickets.filter((t) => !dependentIds.has(t.id));

  const topLevelInProgress = filterDependents(inProgressTickets);
  const topLevelReady = filterDependents(readyOpenTickets);
  const topLevelClosed = filterDependents(filteredClosedTickets);

  // Check if adding a dependency would create a cycle
  // Returns true if adding childId -> blockerId would create a cycle
  const wouldCreateDepCycle = (childId: string, blockerId: string): boolean => {
    // If blocker already depends on child (directly or transitively), adding child -> blocker creates cycle
    const visited = new Set<string>();
    const toVisit = [blockerId];

    while (toVisit.length > 0) {
      const current = toVisit.pop()!;
      if (current === childId) return true;
      if (visited.has(current)) continue;
      visited.add(current);

      const ticket = allTicketsList.find((t) => t.id === current);
      if (ticket) {
        for (const dep of ticket.deps) {
          toVisit.push(dep);
        }
      }
    }
    return false;
  };

  // Check if setting parent would create an ancestry cycle
  // Returns true if targetId is already a descendant of sourceId (via parent chain)
  const wouldCreateParentCycle = (sourceId: string, targetId: string): boolean => {
    // Walk up the parent chain from target - if we hit source, it would create a cycle
    const visited = new Set<string>();
    let current = targetId;

    while (current) {
      if (current === sourceId) return true;
      if (visited.has(current)) return false; // Already visited, no cycle to source
      visited.add(current);

      const ticket = allTicketsList.find((t) => t.id === current);
      if (!ticket?.parent) break;
      current = ticket.parent;
    }
    return false;
  };

  // Check if dropping childId onto targetId is valid
  // For parent mode: check ancestry cycle
  // For dependency mode: check dep cycle and existing dep
  const isValidCardDrop = (childId: string, targetId: string): boolean => {
    if (childId === targetId) return false;

    const child = allTicketsList.find((t) => t.id === childId);
    if (!child) return false;

    if (isShiftHeld) {
      // Dependency mode: check if already a dep or would create cycle
      if (child.deps.includes(targetId)) return false;
      return !wouldCreateDepCycle(childId, targetId);
    } else {
      // Parent mode: check if already the parent or would create ancestry cycle
      if (child.parent === targetId) return false;
      return !wouldCreateParentCycle(childId, targetId);
    }
  };

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
    const data = event.active.data.current;
    const ticket = data?.ticket as Ticket | undefined;
    if (ticket) {
      setActiveTicket(ticket);
      setActiveRelationshipType(data?.relationshipType as RelationshipType | undefined ?? null);
      setActiveParentId(data?.parentId as string | undefined ?? null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const overData = event.over?.data.current;
    const overId = event.over?.id as string | undefined;

    // Check if hovering over a card (drop target)
    if (overData?.isCard && overData?.ticket) {
      setOverCardId(overData.ticket.id);
      setOverColumn(null);
    } else {
      setOverCardId(null);
      setOverColumn(overId as ColumnId ?? null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const currentRelationshipType = activeRelationshipType;
    const currentParentId = activeParentId;

    setActiveTicket(null);
    setActiveRelationshipType(null);
    setActiveParentId(null);
    setOverColumn(null);
    setOverCardId(null);

    if (!over) return;

    const ticket = active.data.current?.ticket as Ticket | undefined;
    if (!ticket) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const isDependent = activeData?.isDependent as boolean | undefined;
    const parentId = activeData?.parentId as string | undefined;

    // Check if dropped on a card (set parent or add dependency)
    if (overData?.isCard && overData?.ticket) {
      const targetTicket = overData.ticket as Ticket;
      if (isValidCardDrop(ticket.id, targetTicket.id)) {
        setDroppedTicketId(ticket.id);
        setTimeout(() => setDroppedTicketId(null), 500);
        if (isShiftHeld) {
          // Shift+drag: add dependency
          addDep({ ticketId: ticket.id, blockerId: targetTicket.id });
        } else {
          // Regular drag: set parent
          // Remove any existing dependency - parent relationship subsumes it
          if (ticket.deps.includes(targetTicket.id)) {
            removeDep({ ticketId: ticket.id, blockerId: targetTicket.id });
          }
          setParent({ ticketId: ticket.id, parentId: targetTicket.id });
        }
      }
      return;
    }

    // Dropped on column
    const targetColumn = over.id as ColumnId;

    // Can't drop on blocked column
    if (targetColumn === "blocked") return;

    // If dragging a dependent card to a column, handle based on relationship type
    if (isDependent && parentId) {
      const relationshipType = currentRelationshipType ?? activeData?.relationshipType as RelationshipType | undefined;

      // Dependency relationships cannot be cleared by dropping on column
      if (relationshipType === "dependency") {
        return;
      }

      // Parent-child relationship: clear the parent
      if (relationshipType === "parent") {
        setDroppedTicketId(ticket.id);
        setTimeout(() => setDroppedTicketId(null), 500);

        clearParent({ ticketId: ticket.id, parentId });

        // Optionally change status based on target column
        const sourceStatus = getSourceStatus(ticket);
        if (targetColumn === "in_progress" && sourceStatus !== "in_progress") {
          setTimeout(() => start(ticket.id), 100);
        } else if (targetColumn === "closed" && sourceStatus !== "closed") {
          setTimeout(() => close(ticket.id), 100);
        } else if (targetColumn === "ready" && sourceStatus !== "open") {
          setTimeout(() => reopen(ticket.id), 100);
        }
        return;
      }

      // Legacy fallback for when relationshipType wasn't set (remove dependency)
      setDroppedTicketId(ticket.id);
      setTimeout(() => setDroppedTicketId(null), 500);

      removeDep({ ticketId: ticket.id, blockerId: parentId });

      // After removing dep, change status based on target column
      if (targetColumn === "in_progress") {
        setTimeout(() => start(ticket.id), 100);
      } else if (targetColumn === "closed") {
        setTimeout(() => close(ticket.id), 100);
      }
      // ready = open status, which is the default after removing dep
      return;
    }

    // Regular ticket dropped on column - change status
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
    setActiveRelationshipType(null);
    setActiveParentId(null);
    setOverColumn(null);
    setOverCardId(null);
  };

  // Compute valid drop targets for the currently dragged ticket
  const getIsValidDrop = (columnId: ColumnId): boolean => {
    if (!activeTicket) return false;

    // Dependency relationships cannot be cleared by dropping on column
    // Only parent-child relationships can be cleared this way
    if (activeRelationshipType === "dependency") {
      return false;
    }

    // Parent-child relationships: dropping on column clears the parent
    if (activeRelationshipType === "parent") {
      // Allow dropping on any column except blocked
      return columnId !== "blocked";
    }

    return isValidTransition(getSourceStatus(activeTicket), columnId, true);
  };

  // Check if a specific card is a valid drop target
  const getIsValidCardDrop = (cardId: string): boolean => {
    if (!activeTicket) return false;
    return isValidCardDrop(activeTicket.id, cardId);
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
    if (!targetColumn || !isValidTransition(sourceStatus, targetColumn)) return;

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

  // Get tickets for the active tab (top-level only, except Blocked which is flat)
  const getTicketsForTab = (tab: ColumnId): Ticket[] => {
    switch (tab) {
      case "in_progress":
        return topLevelInProgress;
      case "ready":
        return topLevelReady;
      case "blocked":
        return filteredBlockedTickets;
      case "closed":
        return topLevelClosed;
      default:
        return [];
    }
  };

  // Check if tab should show dependents
  const tabShowsDependents = (tab: ColumnId): boolean => {
    return tab !== "blocked";
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
            marginBottom: 12,
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

        {/* Filters */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginBottom: 12,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          <FilterDropdown
            label="Type"
            options={[...TICKET_TYPES]}
            selected={filters.types}
            onChange={(selected) => setFilters((f) => ({ ...f, types: selected as string[] }))}
          />
          <FilterDropdown
            label="Priority"
            options={[...PRIORITIES]}
            selected={filters.priorities}
            onChange={(selected) => setFilters((f) => ({ ...f, priorities: selected as number[] }))}
            renderOption={(p) => `P${p}`}
          />
          {availableAssignees.length > 0 && (
            <FilterDropdown
              label="Assignee"
              options={availableAssignees}
              selected={filters.assignees}
              onChange={(selected) => setFilters((f) => ({ ...f, assignees: selected as string[] }))}
            />
          )}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                ...buttonSecondary,
                padding: "6px 10px",
                fontSize: 12,
                color: colors.textSecondary,
                whiteSpace: "nowrap",
              }}
            >
              Clear
            </button>
          )}
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
            getTicketsForTab(activeTab).map((ticket) => {
              const dependents = tabShowsDependents(activeTab) ? dependencyMap.get(ticket.id) || [] : [];
              return (
                <div key={ticket.id}>
                  <SwipeableTicketCard
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
                  {dependents.map((dep) => {
                    const relationshipType: RelationshipType =
                      dep.parent === ticket.id ? "parent" : "dependency";
                    return (
                      <DependentCard
                        key={dep.id}
                        ticket={dep}
                        parentId={ticket.id}
                        relationshipType={relationshipType}
                        onClick={() => handleTicketClick(dep.id)}
                        isDragDisabled
                      />
                    );
                  })}
                </div>
              );
            })
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
    <div style={{ padding: 24, overflowX: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <FilterDropdown
            label="Type"
            options={[...TICKET_TYPES]}
            selected={filters.types}
            onChange={(selected) => setFilters((f) => ({ ...f, types: selected as string[] }))}
          />
          <FilterDropdown
            label="Priority"
            options={[...PRIORITIES]}
            selected={filters.priorities}
            onChange={(selected) => setFilters((f) => ({ ...f, priorities: selected as number[] }))}
            renderOption={(p) => `P${p}`}
          />
          {availableAssignees.length > 0 && (
            <FilterDropdown
              label="Assignee"
              options={availableAssignees}
              selected={filters.assignees}
              onChange={(selected) => setFilters((f) => ({ ...f, assignees: selected as string[] }))}
            />
          )}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              style={{
                ...buttonSecondary,
                padding: "6px 12px",
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              Clear filters
            </button>
          )}
          <button
            onClick={() => setShowNewTicketForm(true)}
            style={buttonPrimary}
          >
            + New Ticket
          </button>
        </div>
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
            flex: 1,
            minHeight: 0,
          }}
        >
          <KanbanColumn
            id="in_progress"
            title="In Progress"
            tickets={topLevelInProgress}
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("in_progress")}
            isDragging={!!activeTicket}
            dependencyMap={dependencyMap}
            showDependents={true}
            getIsValidCardDrop={getIsValidCardDrop}
            dropMode={isShiftHeld ? "dependency" : "parent"}
          />
          <KanbanColumn
            id="ready"
            title="Ready"
            tickets={topLevelReady}
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("ready")}
            isDragging={!!activeTicket}
            dependencyMap={dependencyMap}
            showDependents={true}
            getIsValidCardDrop={getIsValidCardDrop}
            dropMode={isShiftHeld ? "dependency" : "parent"}
          />
          <KanbanColumn
            id="blocked"
            title="Blocked"
            tickets={filteredBlockedTickets}
            color={colors.textSecondary}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("blocked")}
            isDragging={!!activeTicket}
            getIsValidCardDrop={getIsValidCardDrop}
            dropMode={isShiftHeld ? "dependency" : "parent"}
          />
          <KanbanColumn
            id="closed"
            title="Closed"
            tickets={topLevelClosed}
            color={colors.textMuted}
            onTicketClick={handleTicketClick}
            isValidDrop={getIsValidDrop("closed")}
            isDragging={!!activeTicket}
            dependencyMap={dependencyMap}
            showDependents={true}
            getIsValidCardDrop={getIsValidCardDrop}
            dropMode={isShiftHeld ? "dependency" : "parent"}
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
      const touch = e.touches[0];
      if (!touch) return;
      startX.current = touch.clientX;
      startY.current = touch.clientY;
      isHorizontalSwipe.current = null;
      setIsSwiping(true);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      const currentX = touch.clientX;
      const currentY = touch.clientY;
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
