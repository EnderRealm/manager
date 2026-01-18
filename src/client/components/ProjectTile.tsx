import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary } from "../hooks/useProjects.ts";
import { colors, fonts, radius } from "../theme.ts";

interface ProjectTileProps {
  project: ProjectSummary;
}

export function ProjectTile({ project }: ProjectTileProps) {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: `1px solid ${hovered ? colors.border : colors.borderMuted}`,
        borderRadius: radius.lg,
        padding: "16px",
        cursor: "pointer",
        backgroundColor: hovered ? colors.surfaceRaised : colors.surface,
        fontFamily: fonts.sans,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, color: colors.textPrimary }}>{project.name}</h3>
        {project.isDirty && (
          <span style={{ color: colors.warning, fontSize: "12px" }}>Modified</span>
        )}
      </div>

      <div style={{ color: colors.textMuted, fontSize: "12px", marginTop: "4px", fontFamily: fonts.mono }}>
        {project.path}
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
        {project.branch && (
          <span style={{
            backgroundColor: colors.overlay,
            color: colors.accent,
            padding: "2px 8px",
            borderRadius: radius.sm,
            fontSize: "12px",
            fontFamily: fonts.mono,
          }}>
            {project.branch}
          </span>
        )}
        <span style={{
          backgroundColor: colors.overlay,
          color: colors.done,
          padding: "2px 8px",
          borderRadius: radius.sm,
          fontSize: "12px",
        }}>
          {project.language}
        </span>
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "16px", fontSize: "14px" }}>
        <div>
          <span style={{ color: colors.warning, fontWeight: 600 }}>
            {project.ticketCounts.inProgress}
          </span>
          <span style={{ color: colors.textMuted, marginLeft: "4px" }}>in progress</span>
        </div>
        <div>
          <span style={{ color: colors.success, fontWeight: 600 }}>
            {project.ticketCounts.ready}
          </span>
          <span style={{ color: colors.textMuted, marginLeft: "4px" }}>ready</span>
        </div>
        <div>
          <span style={{ color: colors.danger, fontWeight: 600 }}>
            {project.ticketCounts.blocked}
          </span>
          <span style={{ color: colors.textMuted, marginLeft: "4px" }}>blocked</span>
        </div>
      </div>
    </div>
  );
}
