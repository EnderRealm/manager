import { useProjects } from "../hooks/useProjects.ts";
import { ProjectTile } from "./ProjectTile.tsx";
import { colors, fonts } from "../theme.ts";

export function Dashboard() {
  const { data: projects, isLoading, error } = useProjects();

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
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        Projects
      </h1>

      {!projects || projects.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: "center",
            color: colors.textSecondary,
            backgroundColor: colors.surface,
            borderRadius: 8,
            border: `1px solid ${colors.border}`,
          }}
        >
          <p style={{ margin: 0 }}>
            No projects configured. Go to Configuration to add projects.
          </p>
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
    </div>
  );
}
