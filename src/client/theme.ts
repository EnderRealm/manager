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

};

// Priority: Only urgent items get color (heat = attention)
export const priorityColors: Record<number, string> = {
  0: "#f85149", // P0 - Red (critical, needs immediate attention)
  1: "#d29922", // P1 - Orange (high priority)
  2: "#6e7681", // P2 - Grey (normal)
  3: "#6e7681", // P3 - Grey (low)
  4: "#4a5058", // P4 - Darker grey (backlog)
};

// Status: All neutral - position on board communicates status
export const statusColors: Record<string, string> = {
  open: "#6e7681",
  in_progress: "#8b949e",
  blocked: "#8b949e",
  closed: "#4a5058",
};

// Type: All neutral - use text to differentiate, not color
export const typeColors: Record<string, string> = {
  epic: "#8b949e",
  feature: "#8b949e",
  task: "#8b949e",
  bug: "#8b949e",
  chore: "#6e7681",
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
