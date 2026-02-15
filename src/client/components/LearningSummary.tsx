import { useNavigate } from "react-router-dom";
import { usePatterns } from "../hooks/usePatterns.ts";
import { useLearnings } from "../hooks/useLearnings.ts";
import { colors, fonts, radius } from "../theme.ts";

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  observation: { label: "observation", color: colors.textMuted },
  pattern: { label: "pattern", color: colors.accent },
  actioned: { label: "actioned", color: colors.warning },
  resolved: { label: "resolved", color: colors.success },
};

export function LearningSummary() {
  const { data: patternsData } = usePatterns();
  const { data: learningsData } = useLearnings("week");
  const navigate = useNavigate();

  const patterns = patternsData?.patterns || [];
  const activePatterns = patterns.filter(
    (p) => p.status === "pattern" || p.status === "observation"
  );
  const discoveries = learningsData?.recentDiscoveries || [];
  const rollup = learningsData?.rollup;

  // Count by status
  const statusCounts = patterns.reduce(
    (acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  if (patterns.length === 0 && discoveries.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Insights
        </h2>
        <button
          onClick={() => navigate("/insights")}
          style={{
            background: "none",
            border: "none",
            color: colors.accent,
            fontSize: 13,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: radius.sm,
          }}
        >
          View all
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
        }}
      >
        {/* Patterns summary card */}
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            Patterns
          </div>

          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
            }}
          >
            {Object.entries(statusCounts).map(([status, count]) => {
              const badge = STATUS_BADGES[status] || {
                label: status,
                color: colors.textMuted,
              };
              return (
                <div key={status} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: badge.color,
                      fontFamily: fonts.mono,
                    }}
                  >
                    {count}
                  </div>
                  <div
                    style={{ fontSize: 11, color: colors.textMuted }}
                  >
                    {badge.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Top active pattern */}
          {activePatterns[0] && (
            <div
              style={{
                padding: "8px 10px",
                backgroundColor: colors.surfaceRaised,
                borderRadius: radius.sm,
                fontSize: 12,
                color: colors.textSecondary,
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontWeight: 500, color: colors.textPrimary }}>
                {activePatterns[0].id}
              </span>{" "}
              {activePatterns[0].description.slice(0, 100)}
              {activePatterns[0].description.length > 100 ? "..." : ""}
            </div>
          )}
        </div>

        {/* Recent discoveries card */}
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            Recent Discoveries
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {discoveries.slice(0, 3).map((d, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 10px",
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: radius.sm,
                  fontSize: 12,
                  color: colors.textSecondary,
                  lineHeight: 1.4,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    color: colors.textMuted,
                    fontFamily: fonts.mono,
                    marginRight: 6,
                  }}
                >
                  {d.project}
                </span>
                {d.text.slice(0, 120)}
                {d.text.length > 120 ? "..." : ""}
              </div>
            ))}
            {discoveries.length === 0 && (
              <div style={{ fontSize: 12, color: colors.textMuted }}>
                No recent discoveries
              </div>
            )}
          </div>
        </div>

        {/* Weekly stats card */}
        {rollup && (
          <div
            style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 10,
              }}
            >
              This Week
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Stat label="Sessions" value={rollup.sessions} />
              <Stat label="Messages" value={rollup.messageCount} />
              <Stat label="Tool uses" value={rollup.toolUses} />
              <Stat label="Files" value={rollup.filesTouched} />
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 11,
                color: colors.textMuted,
              }}
            >
              {rollup.projects.length} project
              {rollup.projects.length !== 1 ? "s" : ""} active
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: colors.textPrimary,
          fontFamily: fonts.mono,
        }}
      >
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 11, color: colors.textMuted }}>{label}</div>
    </div>
  );
}
