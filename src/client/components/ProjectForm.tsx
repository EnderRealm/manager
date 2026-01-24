import { useState, useEffect } from "react";
import { colors, fonts, radius, inputBase, buttonPrimary, buttonSecondary } from "../theme.ts";
import type { ProjectConfig } from "../hooks/useConfig.ts";

interface ProjectFormProps {
  initialData?: ProjectConfig;
  isEditMode: boolean;
  onSubmit: (data: ProjectConfig) => void;
  onCancel: () => void;
  isPending: boolean;
  error?: string;
}

export function ProjectForm({
  initialData,
  isEditMode,
  onSubmit,
  onCancel,
  isPending,
  error,
}: ProjectFormProps) {
  const [name, setName] = useState(initialData?.name || "");
  const [path, setPath] = useState(initialData?.path || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPath(initialData.path);
    }
  }, [initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
      newErrors.name = "Name must be alphanumeric with dashes or underscores";
    }

    if (!path.trim()) {
      newErrors.path = "Path is required";
    } else if (!path.startsWith("/")) {
      newErrors.path = "Path must be absolute (start with /)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    onSubmit({
      name: name.trim(),
      path: path.trim(),
    });
  };

  const inputStyle = {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box" as const,
    fontFamily: fonts.mono,
  };

  const labelStyle = {
    display: "block",
    marginBottom: "4px",
    fontWeight: 500,
    color: colors.textPrimary,
    fontSize: 13,
    fontFamily: fonts.mono,
  };

  const fieldStyle = {
    marginBottom: "16px",
  };

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 20,
          fontWeight: 600,
          fontFamily: fonts.mono,
          color: colors.textPrimary,
        }}
      >
        {isEditMode ? "edit project" : "add project"}
      </h1>

      <form onSubmit={handleSubmit}>
        <div style={fieldStyle}>
          <label style={labelStyle}>
            name <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isEditMode}
            placeholder="my-project"
            style={{
              ...inputStyle,
              borderColor: errors.name ? colors.danger : colors.border,
              opacity: isEditMode ? 0.6 : 1,
            }}
          />
          {errors.name && (
            <div style={{ color: colors.danger, fontSize: 12, marginTop: 4, fontFamily: fonts.mono }}>
              {errors.name}
            </div>
          )}
          {!isEditMode && (
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontFamily: fonts.mono }}>
              used as identifier and display name
            </div>
          )}
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>
            path <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/Users/you/code/project"
            style={{
              ...inputStyle,
              borderColor: errors.path ? colors.danger : colors.border,
            }}
          />
          {errors.path && (
            <div style={{ color: colors.danger, fontSize: 12, marginTop: 4, fontFamily: fonts.mono }}>
              {errors.path}
            </div>
          )}
          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontFamily: fonts.mono }}>
            absolute path to project root
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button
            type="submit"
            disabled={isPending}
            style={{
              ...buttonPrimary,
              padding: "10px 20px",
              fontFamily: fonts.mono,
              fontSize: 13,
              textTransform: "lowercase",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending
              ? isEditMode
                ? "saving..."
                : "adding..."
              : isEditMode
                ? "save"
                : "add project"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonSecondary,
              padding: "10px 20px",
              fontFamily: fonts.mono,
              fontSize: 13,
              textTransform: "lowercase",
            }}
          >
            cancel
          </button>
        </div>

        {error && (
          <div style={{ color: colors.danger, marginTop: 12, fontSize: 13, fontFamily: fonts.mono }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
