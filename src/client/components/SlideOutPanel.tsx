import { useEffect, type ReactNode } from "react";
import { colors, radius } from "../theme.ts";

interface SlideOutPanelProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
}

export function SlideOutPanel({
  open,
  onClose,
  children,
  width = 640,
}: SlideOutPanelProps) {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "relative",
          width,
          maxWidth: "100%",
          height: "100%",
          backgroundColor: colors.canvas,
          borderLeft: `1px solid ${colors.border}`,
          boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.3)",
          display: "flex",
          flexDirection: "column",
          animation: "slideIn 0.2s ease-out",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: `1px solid ${colors.border}`,
            borderRadius: radius.sm,
            color: colors.textMuted,
            cursor: "pointer",
            fontSize: 18,
            zIndex: 1,
          }}
          title="Close (Esc)"
        >
          ×
        </button>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
