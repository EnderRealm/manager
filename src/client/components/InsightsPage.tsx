import { useState } from "react";
import { usePatterns, type Pattern } from "../hooks/usePatterns.ts";
import { useLearnings } from "../hooks/useLearnings.ts";
import { useActivity } from "../hooks/useActivity.ts";
import { colors, fonts, radius } from "../theme.ts";

const STATUS_COLORS: Record<string, string> = {
  observation: colors.textMuted,
  pattern: colors.accent,
  actioned: colors.warning,
  resolved: colors.success,
};

export function InsightsPage() {
  const [activeTab, setActiveTab] = useState<
    "patterns" | "learnings" | "activity"
  >("patterns");

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          margin: "0 0 20px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        Insights
      </h1>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: 20,
        }}
      >
        {(["patterns", "learnings", "activity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: "none",
              border: "none",
              padding: "10px 20px",
              fontSize: 14,
              color:
                activeTab === tab ? colors.textPrimary : colors.textSecondary,
              borderBottom:
                activeTab === tab
                  ? `2px solid ${colors.accent}`
                  : "2px solid transparent",
              cursor: "pointer",
              textTransform: "capitalize",
              fontWeight: activeTab === tab ? 600 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "patterns" && <PatternsTab />}
      {activeTab === "learnings" && <LearningsTab />}
      {activeTab === "activity" && <ActivityTab />}
    </div>
  );
}

// --- Patterns Tab ---

function PatternsTab() {
  const { data, isLoading } = usePatterns();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  if (isLoading) {
    return <Loading />;
  }

  const patterns = data?.patterns || [];
  const filtered =
    filter === "all" ? patterns : patterns.filter((p) => p.status === filter);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      {/* Status filter */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {["all", "observation", "pattern", "actioned", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              border: `1px solid ${filter === s ? colors.accent : colors.border}`,
              borderRadius: radius.sm,
              backgroundColor:
                filter === s ? colors.accentEmphasis : colors.surface,
              color: filter === s ? colors.textPrimary : colors.textSecondary,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
            {s !== "all" && (
              <span style={{ marginLeft: 6, opacity: 0.7 }}>
                {patterns.filter((p) => s === "all" || p.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Patterns list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map((p) => (
          <PatternCard
            key={p.id}
            pattern={p}
            isExpanded={expanded.has(p.id)}
            onToggle={() => toggleExpand(p.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ color: colors.textMuted, fontSize: 13, padding: 20 }}>
            No patterns matching filter
          </div>
        )}
      </div>
    </div>
  );
}

function PatternCard({
  pattern,
  isExpanded,
  onToggle,
}: {
  pattern: Pattern;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const statusColor = STATUS_COLORS[pattern.status] || colors.textMuted;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        overflow: "hidden",
      }}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          color: colors.textPrimary,
        }}
      >
        <span
          style={{
            fontSize: 10,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s",
            color: colors.textMuted,
          }}
        >
          ▶
        </span>

        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            color: colors.textMuted,
            flexShrink: 0,
          }}
        >
          {pattern.id}
        </span>

        <span
          style={{
            padding: "2px 8px",
            fontSize: 10,
            borderRadius: 10,
            backgroundColor: `${statusColor}22`,
            color: statusColor,
            border: `1px solid ${statusColor}44`,
            flexShrink: 0,
            textTransform: "capitalize",
          }}
        >
          {pattern.status}
        </span>

        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: colors.textSecondary,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {pattern.description}
        </span>

        <span
          style={{
            fontSize: 12,
            color: colors.textMuted,
            fontFamily: fonts.mono,
            flexShrink: 0,
          }}
        >
          {pattern.occurrences}x
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div
          style={{
            padding: "0 16px 16px",
            borderTop: `1px solid ${colors.borderMuted}`,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 16,
              padding: "12px 0",
              fontSize: 12,
              color: colors.textMuted,
            }}
          >
            <span>
              First: {pattern.firstSeen}
            </span>
            <span>
              Last: {pattern.lastSeen}
            </span>
            <span>
              Projects: {pattern.projects.join(", ")}
            </span>
          </div>

          {/* Evidence */}
          <div style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: colors.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: 6,
              }}
            >
              Evidence
            </div>
            <ul
              style={{
                margin: 0,
                padding: "0 0 0 16px",
                fontSize: 12,
                color: colors.textSecondary,
                lineHeight: 1.6,
              }}
            >
              {pattern.evidence.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>

          {/* Suggested Action */}
          {pattern.suggestedAction && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: colors.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: 6,
                }}
              >
                Suggested Action
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  backgroundColor: colors.surfaceRaised,
                  borderRadius: radius.sm,
                  fontSize: 12,
                  color: colors.textSecondary,
                  lineHeight: 1.5,
                }}
              >
                {pattern.suggestedAction}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Learnings Tab ---

function LearningsTab() {
  const { data: weekData, isLoading: weekLoading } = useLearnings("week");
  const [section, setSection] = useState<"discoveries" | "decisions">(
    "discoveries"
  );

  if (weekLoading) return <Loading />;

  const items =
    section === "discoveries"
      ? weekData?.recentDiscoveries || []
      : weekData?.recentDecisions || [];

  // Group by project
  const grouped = new Map<
    string,
    { text: string; date: string }[]
  >();
  for (const item of items) {
    if (!grouped.has(item.project)) grouped.set(item.project, []);
    grouped.get(item.project)!.push({ text: item.text, date: item.date });
  }

  return (
    <div>
      {/* Section toggle */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["discoveries", "decisions"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              border: `1px solid ${section === s ? colors.accent : colors.border}`,
              borderRadius: radius.sm,
              backgroundColor:
                section === s ? colors.accentEmphasis : colors.surface,
              color: section === s ? colors.textPrimary : colors.textSecondary,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Grouped by project */}
      {Array.from(grouped.entries()).map(([project, entries]) => (
        <div key={project} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: colors.textSecondary,
              fontFamily: fonts.mono,
              marginBottom: 8,
            }}
          >
            {project}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {entries.map((entry, i) => (
              <div
                key={i}
                style={{
                  padding: "10px 12px",
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.sm,
                  fontSize: 13,
                  color: colors.textSecondary,
                  lineHeight: 1.5,
                  display: "flex",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: colors.textMuted,
                    fontFamily: fonts.mono,
                    flexShrink: 0,
                    paddingTop: 1,
                  }}
                >
                  {entry.date}
                </span>
                <span style={{ flex: 1 }}>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div style={{ color: colors.textMuted, fontSize: 13, padding: 20 }}>
          No {section} found
        </div>
      )}

      {/* Rollup summary */}
      {weekData?.rollup && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: colors.textMuted,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Weekly Rollup — {weekData.rollup.date}
          </div>
          <div
            style={{
              fontSize: 13,
              color: colors.textSecondary,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
            }}
          >
            {weekData.rollup.body.slice(0, 1000)}
            {weekData.rollup.body.length > 1000 ? "..." : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Activity Tab ---

function ActivityTab() {
  const { data, isLoading } = useActivity("3months");

  if (isLoading) return <Loading />;

  const days = data?.days || [];
  const activeDays = days.filter((d) => d.total > 0);

  // Per-project aggregate
  const projectStats = new Map<
    string,
    { sessions: number; tokens: number; days: number }
  >();
  for (const day of activeDays) {
    for (const p of day.projects) {
      const existing = projectStats.get(p.name) || {
        sessions: 0,
        tokens: 0,
        days: 0,
      };
      existing.sessions += p.sessions;
      existing.tokens += p.tokenCount;
      existing.days += 1;
      projectStats.set(p.name, existing);
    }
  }

  const sortedProjects = Array.from(projectStats.entries()).sort(
    (a, b) => b[1].sessions - a[1].sessions
  );

  // Weekly aggregation for chart
  const weeks = new Map<string, { sessions: number; tokens: number }>();
  for (const day of days) {
    const d = new Date(day.date + "T12:00:00");
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);
    const existing = weeks.get(weekKey) || { sessions: 0, tokens: 0 };
    for (const p of day.projects) {
      existing.sessions += p.sessions;
      existing.tokens += p.tokenCount;
    }
    weeks.set(weekKey, existing);
  }

  const weeklyData = Array.from(weeks.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, stats]) => ({ week, ...stats }));

  const maxWeeklySessions = Math.max(...weeklyData.map((w) => w.sessions), 1);

  return (
    <div>
      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatCard label="Active Days" value={activeDays.length} sub="last 3 months" />
        <StatCard
          label="Total Sessions"
          value={activeDays.reduce(
            (s, d) => s + d.projects.reduce((ss, p) => ss + p.sessions, 0),
            0
          )}
          sub="last 3 months"
        />
        <StatCard label="Projects" value={projectStats.size} sub="unique" />
        <StatCard
          label="Avg Sessions/Day"
          value={
            activeDays.length > 0
              ? (
                  activeDays.reduce(
                    (s, d) =>
                      s + d.projects.reduce((ss, p) => ss + p.sessions, 0),
                    0
                  ) / activeDays.length
                ).toFixed(1)
              : "0"
          }
          sub="on active days"
        />
      </div>

      {/* Weekly sessions bar chart */}
      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: 12,
          }}
        >
          Weekly Sessions
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            height: 100,
          }}
        >
          {weeklyData.map((w) => (
            <div
              key={w.week}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 24,
                  height: Math.max(
                    2,
                    (w.sessions / maxWeeklySessions) * 80
                  ),
                  backgroundColor:
                    w.sessions > 0 ? colors.accent : colors.surfaceRaised,
                  borderRadius: "2px 2px 0 0",
                  opacity: w.sessions > 0 ? 0.8 : 0.3,
                }}
                title={`${w.week}: ${w.sessions} sessions`}
              />
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 4,
            fontSize: 10,
            color: colors.textMuted,
          }}
        >
          {weeklyData.length > 0 && (
            <>
              <span>{weeklyData[0].week.slice(5)}</span>
              <span>{weeklyData[weeklyData.length - 1].week.slice(5)}</span>
            </>
          )}
        </div>
      </div>

      {/* Per-project breakdown */}
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
            marginBottom: 12,
          }}
        >
          Project Breakdown
        </div>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${colors.border}`,
                color: colors.textMuted,
                fontSize: 11,
                textTransform: "uppercase",
              }}
            >
              <th style={{ textAlign: "left", padding: "8px 0", fontWeight: 500 }}>
                Project
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>
                Sessions
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>
                Active Days
              </th>
              <th style={{ textAlign: "right", padding: "8px 0", fontWeight: 500 }}>
                Tokens
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProjects.map(([name, stats]) => (
              <tr
                key={name}
                style={{
                  borderBottom: `1px solid ${colors.borderMuted}`,
                  color: colors.textSecondary,
                }}
              >
                <td
                  style={{
                    padding: "8px 0",
                    fontFamily: fonts.mono,
                    fontSize: 12,
                  }}
                >
                  {name}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px 0",
                    fontFamily: fonts.mono,
                  }}
                >
                  {stats.sessions}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px 0",
                    fontFamily: fonts.mono,
                  }}
                >
                  {stats.days}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "8px 0",
                    fontFamily: fonts.mono,
                  }}
                >
                  {stats.tokens > 0
                    ? (stats.tokens / 1000).toFixed(0) + "k"
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
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
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
          fontFamily: fonts.mono,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: colors.textMuted }}>{sub}</div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ color: colors.textMuted, fontSize: 13, padding: 20 }}>
      Loading...
    </div>
  );
}
