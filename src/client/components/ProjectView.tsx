import { useState } from "react";
import { useParams } from "react-router-dom";
import { KanbanBoard } from "./KanbanBoard.tsx";
import { TableView } from "./TableView.tsx";
import { ServicesDropdown } from "./ServicesDropdown.tsx";
import { LogsPanel } from "./LogsPanel.tsx";
import { colors, radius } from "../theme.ts";

type ViewTab = "board" | "table";

export function ProjectView() {
  const { id: projectId } = useParams<{ id: string }>();
  const [activeView, setActiveView] = useState<ViewTab>("board");
  const [logsServiceId, setLogsServiceId] = useState<string | null>(null);

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
        <div style={{ flex: 1 }} />
        {projectId && (
          <ServicesDropdown
            projectId={projectId}
            onViewLogs={setLogsServiceId}
          />
        )}
      </div>

      {/* View content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeView === "board" ? <KanbanBoard /> : <TableView />}
      </div>

      {/* Logs panel */}
      {projectId && (
        <LogsPanel
          projectId={projectId}
          serviceId={logsServiceId}
          onClose={() => setLogsServiceId(null)}
        />
      )}
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
