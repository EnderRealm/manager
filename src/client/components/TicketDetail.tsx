import { useParams, useNavigate } from "react-router-dom";
import { useTicket, useTicketMutations } from "../hooks/useTickets.ts";
import { colors, fonts, radius, buttonSecondary, typeColors, statusColors } from "../theme.ts";

export function TicketDetail() {
  const { id: projectId, ticketId } = useParams<{
    id: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading, error } = useTicket(projectId!, ticketId!);
  const { start, close, reopen } = useTicketMutations(projectId!);

  const actionButtonStyle = {
    padding: "8px 16px",
    color: colors.textPrimary,
    backgroundColor: colors.overlay,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: "14px",
  };

  if (isLoading) {
    return (
      <div style={{ padding: "24px", color: colors.textSecondary, fontFamily: fonts.sans }}>
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: "24px", color: colors.danger, fontFamily: fonts.sans }}>
        Error loading ticket
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", fontFamily: fonts.sans }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          style={buttonSecondary}
        >
          ← Back
        </button>
        <span style={{ color: colors.textMuted, fontFamily: fonts.mono }}>
          {ticket.id}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <span
          style={{
            backgroundColor: statusColors[ticket.status] ?? colors.textMuted,
            color: colors.canvas,
            padding: "4px 12px",
            borderRadius: radius.sm,
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {ticket.status.replace("_", " ")}
        </span>
        <span
          style={{
            backgroundColor: typeColors[ticket.type] ?? colors.textMuted,
            color: colors.canvas,
            padding: "4px 12px",
            borderRadius: radius.sm,
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {ticket.type}
        </span>
        <span
          style={{
            backgroundColor: colors.overlay,
            color: colors.textSecondary,
            padding: "4px 12px",
            borderRadius: radius.sm,
            fontSize: "14px",
            border: `1px solid ${colors.border}`,
          }}
        >
          P{ticket.priority}
        </span>
      </div>

      <h1 style={{ marginTop: 0, color: colors.textPrimary }}>{ticket.title || "(no title)"}</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: "8px 16px",
          marginTop: "24px",
        }}
      >
        {ticket.assignee && (
          <>
            <div style={{ color: colors.textMuted }}>Assignee</div>
            <div style={{ color: colors.textPrimary }}>{ticket.assignee}</div>
          </>
        )}
        {ticket.parent && (
          <>
            <div style={{ color: colors.textMuted }}>Parent</div>
            <div style={{ color: colors.accent, fontFamily: fonts.mono }}>{ticket.parent}</div>
          </>
        )}
        {ticket.deps.length > 0 && (
          <>
            <div style={{ color: colors.textMuted }}>Dependencies</div>
            <div style={{ color: colors.accent, fontFamily: fonts.mono }}>{ticket.deps.join(", ")}</div>
          </>
        )}
        {ticket.links.length > 0 && (
          <>
            <div style={{ color: colors.textMuted }}>Links</div>
            <div style={{ color: colors.accent }}>{ticket.links.join(", ")}</div>
          </>
        )}
        <div style={{ color: colors.textMuted }}>Created</div>
        <div style={{ color: colors.textSecondary }}>{new Date(ticket.created).toLocaleString()}</div>
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "8px" }}>
        {ticket.status === "open" && (
          <button onClick={() => start(ticket.id)} style={actionButtonStyle}>
            Start
          </button>
        )}
        {(ticket.status === "open" || ticket.status === "in_progress") && (
          <button onClick={() => close(ticket.id)} style={actionButtonStyle}>
            Close
          </button>
        )}
        {ticket.status === "closed" && (
          <button onClick={() => reopen(ticket.id)} style={actionButtonStyle}>
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
