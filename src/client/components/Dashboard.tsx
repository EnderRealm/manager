import { useState } from "react";
import { useProjects } from "../hooks/useProjects.ts";
import { ProjectTile } from "./ProjectTile.tsx";
import { ProjectCreateModal } from "./ProjectCreateModal.tsx";
import { ActivityHeatmap } from "./ActivityHeatmap.tsx";
import { colors, fonts, buttonPrimary } from "../theme.ts";

export function Dashboard() {
  const { data: projects, isLoading, error } = useProjects();
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: colors.textSecondary }}>
        Loading projects...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, color: colors.danger }}>
        Error loading projects: {error.message}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
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
          Projects
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            ...buttonPrimary,
            fontFamily: fonts.mono,
            fontSize: 13,
            textTransform: "lowercase",
          }}
        >
          + add project
        </button>
      </div>

      <ActivityHeatmap />

      {!projects || projects.length === 0 ? (
        <div
          style={{
            padding: 48,
            textAlign: "center",
            color: colors.textSecondary,
            backgroundColor: colors.surface,
            borderRadius: 8,
            border: `1px dashed ${colors.border}`,
          }}
        >
          <p style={{ margin: "0 0 16px", fontFamily: fonts.mono, fontSize: 14 }}>
            no projects configured
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              ...buttonPrimary,
              fontFamily: fonts.mono,
              fontSize: 13,
              textTransform: "lowercase",
              padding: "10px 20px",
            }}
          >
            add your first project
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {projects.map((project) => (
            <ProjectTile key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
}
