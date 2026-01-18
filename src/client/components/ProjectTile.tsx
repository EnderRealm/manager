import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../hooks/useProjects.ts";

interface ProjectTileProps {
  project: ProjectSummary;
}

export function ProjectTile({ project }: ProjectTileProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div
      onClick={handleClick}
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "16px",
        cursor: "pointer",
        backgroundColor: "#fff",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>{project.name}</h3>
        {project.isDirty && (
          <span style={{ color: "#e67e22", fontSize: "12px" }}>Modified</span>
        )}
      </div>

      <div style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>
        {project.path}
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
        {project.branch && (
          <span style={{
            backgroundColor: "#3498db",
            color: "#fff",
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "12px"
          }}>
            {project.branch}
          </span>
        )}
        <span style={{
          backgroundColor: "#9b59b6",
          color: "#fff",
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "12px"
        }}>
          {project.language}
        </span>
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "12px", fontSize: "14px" }}>
        <div>
          <span style={{ color: "#e67e22", fontWeight: "bold" }}>
            {project.ticketCounts.inProgress}
          </span>
          <span style={{ color: "#666", marginLeft: "4px" }}>in progress</span>
        </div>
        <div>
          <span style={{ color: "#27ae60", fontWeight: "bold" }}>
            {project.ticketCounts.ready}
          </span>
          <span style={{ color: "#666", marginLeft: "4px" }}>ready</span>
        </div>
        <div>
          <span style={{ color: "#e74c3c", fontWeight: "bold" }}>
            {project.ticketCounts.blocked}
          </span>
          <span style={{ color: "#666", marginLeft: "4px" }}>blocked</span>
        </div>
      </div>
    </div>
  );
}
