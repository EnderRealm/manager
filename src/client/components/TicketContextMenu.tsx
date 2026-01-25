import { useState, useEffect, useRef } from "react";
import { colors, radius, fonts, priorityColors } from "../theme.ts";
import type { Ticket } from "../hooks/useTickets.ts";

type MenuPosition = { x: number; y: number } | null;

interface TicketContextMenuProps {
  ticket: Ticket;
  position: MenuPosition;
  onClose: () => void;
  onEdit: () => void;
  onChangeStatus: (status: "open" | "in_progress" | "closed") => void;
  onChangePriority: (priority: number) => void;
  onAddDependency: () => void;
  onDelete: () => void;
}

export function TicketContextMenu({
  ticket,
  position,
  onClose,
  onEdit,
  onChangeStatus,
  onChangePriority,
  onAddDependency,
  onDelete,
}: TicketContextMenuProps) {
  const [statusSubmenu, setStatusSubmenu] = useState(false);
  const [prioritySubmenu, setPrioritySubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  if (!position) return null;

  const statusOptions: { value: "open" | "in_progress" | "closed"; label: string }[] = [
    { value: "open", label: "Open" },
    { value: "in_progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
  ];

  const priorityOptions = [0, 1, 2, 3, 4];

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        backgroundColor: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: 4,
        zIndex: 1000,
        minWidth: 160,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
        fontFamily: fonts.sans,
        fontSize: 13,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        onClick={() => {
          onEdit();
          onClose();
        }}
      >
        Edit
      </MenuItem>

      <Separator />

      {/* Status submenu */}
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setStatusSubmenu(true)}
        onMouseLeave={() => setStatusSubmenu(false)}
      >
        <MenuItem hasSubmenu>
          Status
        </MenuItem>
        {statusSubmenu && (
          <Submenu>
            {statusOptions.map((opt) => (
              <MenuItem
                key={opt.value}
                active={ticket.status === opt.value}
                onClick={() => {
                  onChangeStatus(opt.value);
                  onClose();
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </Submenu>
        )}
      </div>

      {/* Priority submenu */}
      <div
        style={{ position: "relative" }}
        onMouseEnter={() => setPrioritySubmenu(true)}
        onMouseLeave={() => setPrioritySubmenu(false)}
      >
        <MenuItem hasSubmenu>
          Priority
        </MenuItem>
        {prioritySubmenu && (
          <Submenu>
            {priorityOptions.map((p) => (
              <MenuItem
                key={p}
                active={ticket.priority === p}
                onClick={() => {
                  onChangePriority(p);
                  onClose();
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: priorityColors[p],
                    marginRight: 8,
                  }}
                />
                P{p}
              </MenuItem>
            ))}
          </Submenu>
        )}
      </div>

      <Separator />

      <MenuItem
        onClick={() => {
          onAddDependency();
          onClose();
        }}
      >
        Add Dependency...
      </MenuItem>

      <Separator />

      <MenuItem
        danger
        onClick={() => {
          onDelete();
          onClose();
        }}
      >
        Delete
      </MenuItem>
    </div>
  );
}

function MenuItem({
  children,
  onClick,
  active,
  danger,
  hasSubmenu,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  hasSubmenu?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: radius.sm,
        backgroundColor: hovered ? colors.overlay : "transparent",
        color: danger ? colors.danger : active ? colors.accent : colors.textPrimary,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{children}</span>
      {hasSubmenu && (
        <span style={{ color: colors.textMuted, fontSize: 10, marginLeft: 8 }}>
          ▶
        </span>
      )}
    </div>
  );
}

function Submenu({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "100%",
        marginLeft: 4,
        backgroundColor: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: 4,
        minWidth: 120,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function Separator() {
  return (
    <div
      style={{
        height: 1,
        backgroundColor: colors.border,
        margin: "4px 0",
      }}
    />
  );
}

// Hook to manage context menu state
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    ticket: Ticket;
    position: MenuPosition;
  } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, ticket: Ticket) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      ticket,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    handleContextMenu,
    closeContextMenu,
  };
}
