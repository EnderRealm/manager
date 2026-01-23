import { useEffect } from "react";
import { colors, radius, buttonPrimary, buttonSecondary, buttonDanger } from "../theme.ts";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

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

  const confirmStyle = variant === "danger" ? buttonDanger : buttonPrimary;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={onCancel}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          animation: "fadeIn 0.15s ease-out",
        }}
      />

      <div
        style={{
          position: "relative",
          backgroundColor: colors.surfaceRaised,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          animation: "scaleIn 0.15s ease-out",
        }}
      >
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 18,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            margin: "0 0 24px",
            fontSize: 14,
            color: colors.textSecondary,
            lineHeight: 1.5,
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            style={{
              ...buttonSecondary,
              padding: "10px 20px",
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              ...confirmStyle,
              padding: "10px 20px",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
