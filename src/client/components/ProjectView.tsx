import { useState } from "react";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { TableView } from "./TableView.tsx";
import { ServicesView } from "./ServicesView.tsx";
import { colors, radius } from "../theme.ts";

type ViewTab = "board" | "table" | "services";

export function ProjectView() {
  const [activeView, setActiveView] = useState<ViewTab>("board");

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* View tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "16px 24px 0",
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.canvas,
        }}
      >
        <TabButton
          label="Board"
          isActive={activeView === "board"}
          onClick={() => setActiveView("board")}
        />
        <TabButton
          label="Table"
          isActive={activeView === "table"}
          onClick={() => setActiveView("table")}
        />
        <TabButton
          label="Services"
          isActive={activeView === "services"}
          onClick={() => setActiveView("services")}
        />
      </div>

      {/* View content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeView === "board" && <KanbanBoard />}
        {activeView === "table" && <TableView />}
        {activeView === "services" && <ServicesView />}
      </div>
    </div>
  );
}

function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        fontSize: 14,
        fontWeight: 500,
        border: "none",
        borderRadius: `${radius.sm} ${radius.sm} 0 0`,
        cursor: "pointer",
        backgroundColor: isActive ? colors.surface : "transparent",
        color: isActive ? colors.textPrimary : colors.textSecondary,
        borderBottom: isActive ? `2px solid ${colors.accent}` : "2px solid transparent",
        marginBottom: -1,
        transition: "color 0.15s, background-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}
