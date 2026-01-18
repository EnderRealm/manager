export const colors = {
  // Background layers
  canvas: "#0d1117",
  surface: "#161b22",
  surfaceRaised: "#1c2128",
  overlay: "#21262d",

  // Borders
  border: "#30363d",
  borderMuted: "#21262d",

  // Text
  textPrimary: "#e6edf3",
  textSecondary: "#8b949e",
  textMuted: "#6e7681",

  // Accent colors
  accent: "#58a6ff",
  accentEmphasis: "#1f6feb",

  // Status colors
  success: "#3fb950",
  successEmphasis: "#238636",
  warning: "#d29922",
  warningEmphasis: "#9e6a03",
  danger: "#f85149",
  dangerEmphasis: "#da3633",
  done: "#a371f7",

  // Ticket type colors (adapted for dark theme)
  epic: "#a371f7",
  feature: "#58a6ff",
  task: "#3fb950",
  bug: "#f85149",
  chore: "#8b949e",
};

export const priorityColors: Record<number, string> = {
  0: "#f85149",
  1: "#d29922",
  2: "#58a6ff",
  3: "#3fb950",
  4: "#6e7681",
};

export const statusColors: Record<string, string> = {
  open: "#58a6ff",
  in_progress: "#d29922",
  closed: "#3fb950",
};

export const typeColors: Record<string, string> = {
  epic: colors.epic,
  feature: colors.feature,
  task: colors.task,
  bug: colors.bug,
  chore: colors.chore,
};

export const fonts = {
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
};

export const radius = {
  sm: "4px",
  md: "6px",
  lg: "8px",
};

export const buttonBase = {
  padding: "8px 16px",
  border: "none",
  borderRadius: radius.sm,
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: 500,
  fontFamily: fonts.sans,
};

export const buttonPrimary = {
  ...buttonBase,
  backgroundColor: colors.successEmphasis,
  color: colors.textPrimary,
};

export const buttonSecondary = {
  ...buttonBase,
  backgroundColor: colors.overlay,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
};

export const buttonDanger = {
  ...buttonBase,
  backgroundColor: colors.dangerEmphasis,
  color: colors.textPrimary,
};

export const inputBase = {
  padding: "8px 12px",
  fontSize: "14px",
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.sm,
  fontFamily: fonts.sans,
};
