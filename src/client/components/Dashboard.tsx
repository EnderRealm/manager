import { useNavigate } from "react-router-dom";
import { useProjects } from "../hooks/useProjects.ts";
import { ProjectTile } from "./ProjectTile.tsx";

export function Dashboard() {
  const navigate = useNavigate();
  const { data: projects, isLoading, error } = useProjects();

  if (isLoading) {
    return <div style={{ padding: "24px" }}>Loading projects...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: "24px", color: "#e74c3c" }}>
        Error loading projects: {error.message}
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ marginTop: 0 }}>Projects</h1>
          <button
            onClick={() => navigate("/settings")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Settings
          </button>
        </div>
        <p>No projects configured. Go to Settings to add projects.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h1 style={{ marginTop: 0, marginBottom: 0 }}>Projects</h1>
        <button
          onClick={() => navigate("/settings")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
          }}
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
