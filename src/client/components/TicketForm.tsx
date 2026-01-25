import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCreateTicket, type CreateTicketInput } from "../hooks/useTickets.ts";
import { colors, fonts, radius, buttonSecondary, buttonPrimary, inputBase } from "../theme.ts";

interface TicketFormContentProps {
  projectId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketFormContent({
  projectId,
  onSuccess,
  onCancel,
}: TicketFormContentProps) {
  const navigate = useNavigate();
  const createMutation = useCreateTicket(projectId);

  const [title, setTitle] = useState("");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState(2);
  const [description, setDescription] = useState("");
  const [parent, setParent] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const input: CreateTicketInput = {
      title: title.trim(),
      type,
      priority,
      description: description.trim() || undefined,
      parent: parent.trim() || undefined,
    };

    createMutation.mutate(input, {
      onSuccess: () => {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate(`/projects/${projectId}`);
        }
      },
    });
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(`/projects/${projectId}`);
    }
  };

  const inputStyle = {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const selectStyle = {
    ...inputBase,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const labelStyle = {
    display: "block",
    marginBottom: "4px",
    fontWeight: 500,
    color: colors.textPrimary,
  };

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          margin: "0 0 24px",
          fontSize: 24,
          fontWeight: 600,
          color: colors.textPrimary,
        }}
      >
        New Ticket
      </h1>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>
            Title <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            style={{
              ...inputStyle,
              borderColor: errors.title ? colors.danger : colors.border,
            }}
          />
          {errors.title && (
            <div style={{ color: colors.danger, fontSize: "12px", marginTop: "4px" }}>
              {errors.title}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={selectStyle}
            >
              <option value="task">Task</option>
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="epic">Epic</option>
              <option value="chore">Chore</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              style={selectStyle}
            >
              <option value={0}>P0 - Critical</option>
              <option value={1}>P1 - High</option>
              <option value={2}>P2 - Medium</option>
              <option value={3}>P3 - Low</option>
              <option value={4}>P4 - Backlog</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={labelStyle}>Parent Ticket ID</label>
          <input
            type="text"
            value={parent}
            onChange={(e) => setParent(e.target.value)}
            placeholder="e.g., m-2b6b"
            style={{
              ...inputStyle,
              fontFamily: fonts.mono,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={createMutation.isPending}
            style={{
              ...buttonPrimary,
              padding: "12px 24px",
              cursor: createMutation.isPending ? "not-allowed" : "pointer",
              opacity: createMutation.isPending ? 0.7 : 1,
            }}
          >
            {createMutation.isPending ? "Creating..." : "Create Ticket"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            style={{
              ...buttonSecondary,
              padding: "12px 24px",
            }}
          >
            Cancel
          </button>
        </div>

        {createMutation.isError && (
          <div style={{ color: colors.danger, marginTop: "12px" }}>
            Failed to create ticket. Please try again.
          </div>
        )}
      </form>
    </div>
  );
}

// Page wrapper that uses URL params
export function TicketForm() {
  const { id: projectId } = useParams<{ id: string }>();

  if (!projectId) {
    return (
      <div style={{ padding: 24, color: colors.danger }}>
        Missing project ID
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <TicketFormContent projectId={projectId} />
    </div>
  );
}
