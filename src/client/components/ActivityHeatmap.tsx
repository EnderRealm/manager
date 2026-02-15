import { useState, useMemo, useRef, useEffect } from "react";
import { useActivity, type DayActivity } from "../hooks/useActivity.ts";
import { colors, fonts, radius } from "../theme.ts";

// Distinct project palette (10 hues, good contrast on dark bg)
const PROJECT_PALETTE = [
  "#58a6ff", // blue
  "#3fb950", // green
  "#d29922", // amber
  "#f85149", // red
  "#a371f7", // purple
  "#f778ba", // pink
  "#79c0ff", // light blue
  "#7ee787", // light green
  "#e3b341", // gold
  "#ffa657", // orange
];

const CELL_SIZE = 13;
const CELL_GAP = 3;
const CELL_STEP = CELL_SIZE + CELL_GAP;
const LABEL_WIDTH = 28;
const HEADER_HEIGHT = 16;
const DOT_RADIUS = 2.5;
const WEEKS = 52;
const DAYS = 7;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getProjectColor(
  project: string,
  colorMap: Map<string, string>
): string {
  if (colorMap.has(project)) return colorMap.get(project)!;
  const idx = colorMap.size % PROJECT_PALETTE.length;
  const color = PROJECT_PALETTE[idx];
  colorMap.set(project, color);
  return color;
}

function getIntensity(tokenCount: number, maxTokens: number): number {
  if (tokenCount === 0 || maxTokens === 0) return 0.2;
  return 0.2 + 0.8 * Math.min(tokenCount / maxTokens, 1);
}

interface TooltipData {
  x: number;
  y: number;
  day: DayActivity;
}

export function ActivityHeatmap() {
  const { data, isLoading } = useActivity("year");
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Close tooltip on scroll
  useEffect(() => {
    const close = () => setTooltip(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, []);

  // Build color map and compute layout from activity data
  const { grid, colorMap, monthLabels, maxTokensPerProject } = useMemo(() => {
    if (!data?.days) {
      return {
        grid: [] as (DayActivity | null)[][],
        colorMap: new Map<string, string>(),
        monthLabels: [] as { label: string; col: number }[],
        maxTokensPerProject: 0,
      };
    }

    const days = data.days;
    const projectColorMap = new Map<string, string>();

    // Assign colors to all projects seen
    for (const day of days) {
      for (const p of day.projects) {
        getProjectColor(p.name, projectColorMap);
      }
    }

    // Find max token count per project per day (for intensity scaling)
    let maxTpd = 0;
    for (const day of days) {
      for (const p of day.projects) {
        const val = p.tokenCount || p.messageCount;
        if (val > maxTpd) maxTpd = val;
      }
    }

    // Build grid: columns = weeks, rows = days of week (0=Sun, 6=Sat)
    // Last column is the current week (partial)
    const gridData: (DayActivity | null)[][] = [];
    const labels: { label: string; col: number }[] = [];

    // Work backwards from today
    const totalDays = days.length;
    const lastDay = new Date(days[totalDays - 1].date);
    const lastDow = lastDay.getDay(); // 0=Sun

    // Pad to fill the final week
    const paddedDays: (DayActivity | null)[] = [];
    // The grid starts on a Sunday. Find how many days to prepend.
    const firstDay = new Date(days[0].date);
    const firstDow = firstDay.getDay();
    for (let i = 0; i < firstDow; i++) paddedDays.push(null);
    for (const d of days) paddedDays.push(d);
    // Pad end to complete the last week
    const remaining = (7 - (paddedDays.length % 7)) % 7;
    for (let i = 0; i < remaining; i++) paddedDays.push(null);

    const numWeeks = paddedDays.length / 7;
    let lastMonth = -1;

    for (let w = 0; w < numWeeks; w++) {
      const col: (DayActivity | null)[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(paddedDays[w * 7 + d]);
      }
      gridData.push(col);

      // Month label: check first non-null day in column
      for (let d = 0; d < 7; d++) {
        const day = col[d];
        if (day) {
          const month = new Date(day.date).getMonth();
          if (month !== lastMonth) {
            labels.push({ label: MONTH_NAMES[month], col: w });
            lastMonth = month;
          }
          break;
        }
      }
    }

    return {
      grid: gridData,
      colorMap: projectColorMap,
      monthLabels: labels,
      maxTokensPerProject: maxTpd,
    };
  }, [data]);

  if (isLoading) {
    return (
      <div
        style={{
          padding: "16px 0",
          color: colors.textMuted,
          fontSize: 13,
        }}
      >
        Loading activity...
      </div>
    );
  }

  if (!data?.days) return null;

  const svgWidth = LABEL_WIDTH + grid.length * CELL_STEP;
  const svgHeight = HEADER_HEIGHT + DAYS * CELL_STEP;

  const projectList = Array.from(colorMap.entries());

  return (
    <div style={{ marginBottom: 24 }}>
      <h2
        style={{
          margin: "0 0 12px",
          fontSize: 16,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        Activity
      </h2>

      <div
        style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: 16,
          overflowX: "auto",
          position: "relative",
        }}
      >
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          style={{ display: "block" }}
        >
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={LABEL_WIDTH + m.col * CELL_STEP}
              y={10}
              fill={colors.textMuted}
              fontSize={10}
              fontFamily={fonts.sans}
            >
              {m.label}
            </text>
          ))}

          {/* Day-of-week labels */}
          {DAY_LABELS.map((label, i) =>
            label ? (
              <text
                key={i}
                x={0}
                y={HEADER_HEIGHT + i * CELL_STEP + CELL_SIZE / 2 + 3}
                fill={colors.textMuted}
                fontSize={10}
                fontFamily={fonts.sans}
              >
                {label}
              </text>
            ) : null
          )}

          {/* Grid cells */}
          {grid.map((week, wi) =>
            week.map((day, di) => {
              const x = LABEL_WIDTH + wi * CELL_STEP;
              const y = HEADER_HEIGHT + di * CELL_STEP;

              if (!day) {
                return null;
              }

              const hasActivity = day.projects.length > 0;

              return (
                <g
                  key={`${wi}-${di}`}
                  onMouseEnter={(e) => {
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltip({
                        x: rect.left + x + CELL_SIZE / 2,
                        y: rect.top + y - 4,
                        day,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: hasActivity ? "pointer" : "default" }}
                >
                  {/* Cell background */}
                  <rect
                    x={x}
                    y={y}
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    rx={2}
                    fill={colors.surfaceRaised}
                  />

                  {/* Project dots */}
                  {day.projects.length === 1 ? (
                    // Single project: centered circle
                    <circle
                      cx={x + CELL_SIZE / 2}
                      cy={y + CELL_SIZE / 2}
                      r={DOT_RADIUS + 1}
                      fill={colorMap.get(day.projects[0].name) || colors.accent}
                      opacity={getIntensity(
                        day.projects[0].tokenCount || day.projects[0].messageCount,
                        maxTokensPerProject
                      )}
                    />
                  ) : day.projects.length > 1 ? (
                    // Multiple projects: grid of dots
                    day.projects.slice(0, 4).map((p, pi) => {
                      const cols = day.projects.length <= 2 ? 2 : 2;
                      const row = Math.floor(pi / cols);
                      const col = pi % cols;
                      const spacing = CELL_SIZE / (cols + 1);
                      const ySpacing =
                        CELL_SIZE /
                        (Math.ceil(Math.min(day.projects.length, 4) / cols) + 1);
                      return (
                        <circle
                          key={pi}
                          cx={x + spacing * (col + 1)}
                          cy={y + ySpacing * (row + 1)}
                          r={DOT_RADIUS}
                          fill={colorMap.get(p.name) || colors.accent}
                          opacity={getIntensity(
                            p.tokenCount || p.messageCount,
                            maxTokensPerProject
                          )}
                        />
                      );
                    })
                  ) : null}
                </g>
              );
            })
          )}
        </svg>

        {/* Tooltip (portal to body for overflow) */}
        {tooltip && <HeatmapTooltip tooltip={tooltip} colorMap={colorMap} />}

        {/* Legend */}
        {projectList.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${colors.borderMuted}`,
            }}
          >
            {projectList.map(([name, color]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  color: colors.textSecondary,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                {name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HeatmapTooltip({
  tooltip,
  colorMap,
}: {
  tooltip: TooltipData;
  colorMap: Map<string, string>;
}) {
  const { day } = tooltip;
  const dateObj = new Date(day.date + "T12:00:00");
  const formatted = dateObj.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const totalSessions = day.projects.reduce((s, p) => s + p.sessions, 0);

  return (
    <div
      style={{
        position: "fixed",
        left: tooltip.x,
        top: tooltip.y,
        transform: "translate(-50%, -100%)",
        backgroundColor: colors.overlay,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        padding: "8px 10px",
        fontSize: 12,
        color: colors.textPrimary,
        pointerEvents: "none",
        zIndex: 1000,
        minWidth: 140,
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: day.projects.length > 0 ? 6 : 0,
          fontSize: 11,
          color: colors.textSecondary,
        }}
      >
        {formatted}
      </div>
      {day.projects.length === 0 ? (
        <div style={{ color: colors.textMuted, fontSize: 11 }}>No activity</div>
      ) : (
        <>
          {day.projects.map((p) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: colorMap.get(p.name),
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{p.name}</span>
              <span style={{ color: colors.textMuted, fontSize: 11 }}>
                {p.sessions}s
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 4,
              paddingTop: 4,
              borderTop: `1px solid ${colors.border}`,
              fontSize: 11,
              color: colors.textMuted,
            }}
          >
            {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </div>
        </>
      )}
    </div>
  );
}
