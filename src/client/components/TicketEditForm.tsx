import { useState, useEffect, useRef } from "react";
import { useTicketMutations, type Ticket, type UpdateTicketInput } from "../hooks/useTickets.ts";
import { colors, fonts, radius, buttonSecondary, buttonPrimary, inputBase } from "../theme.ts";

interface TicketEditFormProps {
  projectId: string;
  ticket: Ticket;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketEditForm({
  projectId,
  ticket,
  onSuccess,
  onCancel,
}: TicketEditFormProps) {
  const { updateTicket, isUpdating } = useTicketMutations(projectId);
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(ticket.title ?? "");
  const [type, setType] = useState(ticket.type);
  const [priority, setPriority] = useState(ticket.priority);
  const [status, setStatus] = useState(ticket.status);
  const [assignee, setAssignee] = useState(ticket.assignee ?? "");
  const [description, setDescription] = useState(ticket.description ?? "");
  const [design, setDesign] = useState(ticket.design ?? "");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState(ticket.acceptanceCriteria ?? "");
  const [parent, setParent] = useState(ticket.parent ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

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
    setError(undefined);

    if (!validate()) {
      return;
    }

    const input: UpdateTicketInput = {};

    if (title.trim() !== (ticket.title ?? "")) {
      input.title = title.trim();
    }
    if (type !== ticket.type) {
      input.type = type;
    }
    if (priority !== ticket.priority) {
      input.priority = priority;
    }
    if (status !== ticket.status) {
      input.status = status;
    }
    if (assignee.trim() !== (ticket.assignee ?? "")) {
      input.assignee = assignee.trim();
    }
    if (description.trim() !== (ticket.description ?? "")) {
      input.description = description.trim();
    }
    if (design.trim() !== (ticket.design ?? "")) {
      input.design = design.trim();
    }
    if (acceptanceCriteria.trim() !== (ticket.acceptanceCriteria ?? "")) {
      input.acceptanceCriteria = acceptanceCriteria.trim();
    }
    if (parent.trim() !== (ticket.parent ?? "")) {
      input.parent = parent.trim();
    }

    if (Object.keys(input).length === 0) {
      onCancel?.();
      return;
    }

    updateTicket(
      { ticketId: ticket.id, input },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update ticket");
        },
      }
    );
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
    fontSize: 13,
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Edit Ticket
        </h1>
        <span
          style={{
            color: colors.textMuted,
            fontFamily: fonts.mono,
            fontSize: 13,
          }}
        >
          {ticket.id}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
            e.preventDefault();
          }
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>
            Title <span style={{ color: colors.danger }}>*</span>
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              ...inputStyle,
              borderColor: errors.title ? colors.danger : colors.border,
            }}
          />
          {errors.title && (
            <div style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              {errors.title}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
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

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="needs_testing">Needs Testing</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Assignee</label>
            <input
              type="text"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="Name"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
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

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Design</label>
          <textarea
            value={design}
            onChange={(e) => setDesign(e.target.value)}
            rows={4}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Acceptance Criteria</label>
          <textarea
            value={acceptanceCriteria}
            onChange={(e) => setAcceptanceCriteria(e.target.value)}
            rows={4}
            style={inputStyle}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="submit"
            disabled={isUpdating}
            style={{
              ...buttonPrimary,
              padding: "10px 20px",
              cursor: isUpdating ? "not-allowed" : "pointer",
              opacity: isUpdating ? 0.7 : 1,
            }}
          >
            {isUpdating ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...buttonSecondary,
              padding: "10px 20px",
            }}
          >
            Cancel
          </button>
        </div>

        {error && (
          <div style={{ color: colors.danger, marginTop: 12 }}>
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
