import { useState } from "react";
import {
  useConfigProjects,
  useAddProject,
  useRemoveProject,
} from "../hooks/useConfig.ts";
import { colors, fonts, radius, buttonPrimary, buttonDanger, inputBase } from "../theme.ts";

export function Settings() {
  const { data: projects, isLoading } = useConfigProjects();
  const addMutation = useAddProject();
  const removeMutation = useRemoveProject();

  const [name, setName] = useState("");
  const [path, setPath] = useState("");
  const [error, setError] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim() || !path.trim()) {
      setError("Name and path are required");
      return;
    }

    addMutation.mutate(
      { name: name.trim(), path: path.trim() },
      {
        onSuccess: () => {
          setName("");
          setPath("");
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  const handleRemove = (projectName: string) => {
    if (!confirm(`Remove project "${projectName}"?`)) {
      return;
    }
    removeMutation.mutate(projectName);
  };

  const inputStyle = {
    ...inputBase,
    flex: 1,
  };

  return (
    <div style={{ padding: 24, maxWidth: 800 }}>
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        Configuration
      </h1>

      <h2 style={{ color: colors.textPrimary, fontSize: 18, marginTop: 0 }}>Managed Projects</h2>

      {isLoading ? (
        <div style={{ color: colors.textSecondary }}>Loading...</div>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          {projects?.length === 0 && (
            <div style={{ color: colors.textMuted, marginBottom: "16px" }}>
              No projects configured. Add one below.
            </div>
          )}
          {projects?.map((project) => (
            <div
              key={project.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                backgroundColor: colors.surface,
                borderRadius: radius.sm,
                marginBottom: "8px",
                border: `1px solid ${colors.border}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: colors.textPrimary }}>{project.name}</div>
                <div style={{ color: colors.textMuted, fontSize: "12px", fontFamily: fonts.mono }}>
                  {project.path}
                </div>
              </div>
              <button
                onClick={() => handleRemove(project.name)}
                disabled={removeMutation.isPending}
                style={buttonDanger}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ color: colors.textPrimary }}>Add Project</h2>
      <form onSubmit={handleAdd}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <input
            type="text"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Absolute path to project"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ ...inputStyle, flex: 2, fontFamily: fonts.mono }}
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            style={buttonPrimary}
          >
            {addMutation.isPending ? "Adding..." : "Add"}
          </button>
        </div>
        {error && (
          <div style={{ color: colors.danger, fontSize: "14px" }}>{error}</div>
        )}
      </form>
    </div>
  );
}
