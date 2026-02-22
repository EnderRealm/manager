import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ProjectSummary, ServiceAggregateStatus, SyncStatus } from "../hooks/useProjects.ts";
import { colors, fonts, radius } from "../theme.ts";

const serviceStatusColors: Record<ServiceAggregateStatus, string> = {
  healthy: colors.success,
  degraded: colors.warning,
  crashed: colors.danger,
  none: colors.textMuted,
  unknown: colors.textMuted,
};

const serviceStatusLabels: Record<ServiceAggregateStatus, string> = {
  healthy: "All services running",
  degraded: "Some services degraded",
  crashed: "Services crashed",
  none: "No services",
  unknown: "Status unknown",
};

interface ProjectTileProps {
  project: ProjectSummary;
}

function GitStatusLine({ git }: { git: ProjectSummary["git"] }) {
  if (!git.branch) return null;

  const parts: string[] = [];
  if (git.ahead > 0) parts.push(`↑${git.ahead}`);
  if (git.behind > 0) parts.push(`↓${git.behind}`);
  if (git.unstaged > 0) parts.push(`~${git.unstaged}`);
  if (git.untracked > 0) parts.push(`+${git.untracked}`);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          backgroundColor: colors.overlay,
          color: colors.accent,
          padding: "2px 8px",
          borderRadius: radius.sm,
          fontSize: "12px",
          fontFamily: fonts.mono,
        }}
      >
        {git.branch}
      </span>
      {parts.length > 0 && (
        <span style={{ color: colors.textMuted, fontSize: "12px", fontFamily: fonts.mono }}>
          {parts.join(" ")}
        </span>
      )}
    </div>
  );
}

function LanguageBar({ languages }: { languages: ProjectSummary["languages"] }) {
  if (languages.breakdown.length === 0) {
    return (
      <div style={{ color: colors.textMuted, fontSize: "12px", fontStyle: "italic" }}>
        Unknown
      </div>
    );
  }

  return (
    <div>
      {/* Bar */}
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          backgroundColor: colors.overlay,
        }}
      >
        {languages.breakdown.map((lang, i) => (
          <div
            key={lang.language}
            style={{
              width: `${lang.percentage}%`,
              backgroundColor: lang.color,
              marginLeft: i > 0 ? 2 : 0,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: 8 }}>
        {languages.breakdown.map((lang) => (
          <div
            key={lang.language}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "12px" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: lang.color,
              }}
            />
            <span style={{ color: colors.textSecondary }}>{lang.language}</span>
            <span style={{ color: colors.textMuted }}>{lang.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceStatusIndicator({
  status,
  details,
}: {
  status: ServiceAggregateStatus;
  details?: { id: string; name: string; status: string }[];
}) {
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipContent = details
    ? details.map((d) => `${d.name}: ${d.status}`).join("\n")
    : serviceStatusLabels[status];

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          display: "inline-block",
          width: 10,
          height: 10,
          borderRadius: "50%",
          backgroundColor: serviceStatusColors[status],
        }}
      />
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            padding: "6px 10px",
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            fontSize: 12,
            color: colors.textSecondary,
            whiteSpace: "pre",
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {tooltipContent}
        </div>
      )}
    </div>
  );
}

function SyncStatusIndicator({ syncStatus }: { syncStatus: SyncStatus }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (syncStatus.state === "synced") return null;

  const isPending = syncStatus.state === "pending";
  const color = isPending ? colors.textMuted : colors.warning;
  const label = isPending ? "Syncing..." : `Sync error: ${syncStatus.error ?? "unknown"}`;

  return (
    <div
      style={{ position: "relative" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        style={{
          fontSize: 12,
          color,
          opacity: isPending ? 0.7 : 1,
        }}
      >
        {isPending ? "⟳" : "⚠"}
      </span>
      {showTooltip && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            padding: "6px 10px",
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            fontSize: 12,
            color: colors.textSecondary,
            whiteSpace: "pre",
            zIndex: 100,
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
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
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: `1px solid ${hovered ? colors.border : colors.borderMuted}`,
        borderRadius: radius.lg,
        padding: "16px",
        cursor: "pointer",
        backgroundColor: hovered ? colors.surfaceRaised : colors.surface,
        fontFamily: fonts.sans,
        transition: "background-color 0.15s, border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, color: colors.textPrimary }}>{project.name}</h3>
        {project.serviceStatus !== "none" && (
          <ServiceStatusIndicator
            status={project.serviceStatus}
            details={project.serviceDetails}
          />
        )}
        <SyncStatusIndicator syncStatus={project.syncStatus} />
      </div>

      <div style={{ color: colors.textMuted, fontSize: "12px", marginTop: "4px", fontFamily: fonts.mono }}>
        {project.path}
      </div>

      {/* Git status */}
      <div style={{ marginTop: 12 }}>
        <GitStatusLine git={project.git} />
      </div>

      {/* Languages */}
      <div style={{ marginTop: 12, flex: 1 }}>
        <LanguageBar languages={project.languages} />
      </div>

      {/* Ticket counts - pinned to bottom */}
      {project.hasTk ? (
        <div style={{ marginTop: "12px", display: "flex", gap: "16px", fontSize: "14px" }}>
          <div>
            <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
              {project.ticketCounts.inProgress}
            </span>
            <span style={{ color: colors.textMuted, marginLeft: "4px" }}>in progress</span>
          </div>
          <div>
            <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
              {project.ticketCounts.ready}
            </span>
            <span style={{ color: colors.textMuted, marginLeft: "4px" }}>ready</span>
          </div>
          <div>
            <span style={{ color: colors.textPrimary, fontWeight: 600 }}>
              {project.ticketCounts.blocked}
            </span>
            <span style={{ color: colors.textMuted, marginLeft: "4px" }}>blocked</span>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "12px", fontSize: "13px", color: colors.textMuted, fontStyle: "italic" }}>
          No ticket tracking
        </div>
      )}
    </div>
  );
}
