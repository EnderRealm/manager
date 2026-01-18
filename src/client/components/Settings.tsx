import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useConfigProjects,
  useAddProject,
  useRemoveProject,
} from "../hooks/useConfig.ts";

export function Settings() {
  const navigate = useNavigate();
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
    padding: "8px 12px",
    fontSize: "14px",
    border: "1px solid #ddd",
    borderRadius: "4px",
    flex: 1,
  };

  return (
    <div style={{ padding: "24px", maxWidth: "800px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0 }}>Settings</h1>
      </div>

      <h2>Managed Projects</h2>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div style={{ marginBottom: "24px" }}>
          {projects?.length === 0 && (
            <div style={{ color: "#666", marginBottom: "16px" }}>
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
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                marginBottom: "8px",
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{project.name}</div>
                <div style={{ color: "#666", fontSize: "12px" }}>
                  {project.path}
                </div>
              </div>
              <button
                onClick={() => handleRemove(project.name)}
                disabled={removeMutation.isPending}
                style={{
                  padding: "6px 12px",
                  backgroundColor: "#e74c3c",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      <h2>Add Project</h2>
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
            style={{ ...inputStyle, flex: 2 }}
          />
          <button
            type="submit"
            disabled={addMutation.isPending}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            {addMutation.isPending ? "Adding..." : "Add"}
          </button>
        </div>
        {error && (
          <div style={{ color: "#e74c3c", fontSize: "14px" }}>{error}</div>
        )}
      </form>
    </div>
  );
}
