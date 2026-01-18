import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects.ts";
import { ProjectTile } from "./ProjectTile.tsx";
import { colors, fonts, buttonSecondary, buttonPrimary } from "../theme.ts";

export function Dashboard() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return (
      <div style={{ padding: "24px", color: colors.textSecondary, fontFamily: fonts.sans }}>
        Loading projects...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: colors.danger, fontFamily: fonts.sans }}>
        Error loading projects: {error.message}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div style={{ padding: "24px", fontFamily: fonts.sans }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0, color: colors.textPrimary }}>Projects</h1>
          <button
            onClick={() => navigate("/settings")}
            style={buttonPrimary}
          >
            Settings
          </button>
        </div>
        <p style={{ color: colors.textSecondary }}>
          No projects configured. Go to Settings to add projects.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", fontFamily: fonts.sans }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: 0, color: colors.textPrimary }}>Projects</h1>
        <button
          onClick={() => navigate("/settings")}
          style={buttonSecondary}
        >
          Settings
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "16px",
        }}
      >
        {projects.map((project) => (
          <ProjectTile key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
