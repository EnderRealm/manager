import { useParams, useNavigate } from "react-router-dom";
import { useTicket, useTicketMutations } from "../hooks/useTickets.ts";

const typeColors: Record<string, string> = {
  epic: "#9b59b6",
  feature: "#3498db",
  task: "#2ecc71",
  bug: "#e74c3c",
  chore: "#95a5a6",
};

const statusColors: Record<string, string> = {
  open: "#3498db",
  in_progress: "#e67e22",
  closed: "#27ae60",
};

export function TicketDetail() {
  const { id: projectId, ticketId } = useParams<{
    id: string;
    ticketId: string;
  }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading, error } = useTicket(projectId!, ticketId!);
  const { start, close, reopen } = useTicketMutations(projectId!);

  if (isLoading) {
    return <div style={{ padding: "24px" }}>Loading ticket...</div>;
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: "24px", color: "#e74c3c" }}>
        Error loading ticket
      </div>
    );
  }

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
          onClick={() => navigate(`/projects/${projectId}`)}
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
        <span style={{ color: "#666", fontFamily: "monospace" }}>
          {ticket.id}
        </span>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        <span
          style={{
            backgroundColor: statusColors[ticket.status] ?? "#95a5a6",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {ticket.status.replace("_", " ")}
        </span>
        <span
          style={{
            backgroundColor: typeColors[ticket.type] ?? "#95a5a6",
            color: "#fff",
            padding: "4px 12px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          {ticket.type}
        </span>
        <span
          style={{
            backgroundColor: "#f5f5f5",
            padding: "4px 12px",
            borderRadius: "4px",
            fontSize: "14px",
          }}
        >
          P{ticket.priority}
        </span>
      </div>

      <h1 style={{ marginTop: 0 }}>{ticket.title || "(no title)"}</h1>

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
            <div style={{ color: "#666" }}>Assignee</div>
            <div>{ticket.assignee}</div>
          </>
        )}
        {ticket.parent && (
          <>
            <div style={{ color: "#666" }}>Parent</div>
            <div>{ticket.parent}</div>
          </>
        )}
        {ticket.deps.length > 0 && (
          <>
            <div style={{ color: "#666" }}>Dependencies</div>
            <div>{ticket.deps.join(", ")}</div>
          </>
        )}
        {ticket.links.length > 0 && (
          <>
            <div style={{ color: "#666" }}>Links</div>
            <div>{ticket.links.join(", ")}</div>
          </>
        )}
        <div style={{ color: "#666" }}>Created</div>
        <div>{new Date(ticket.created).toLocaleString()}</div>
      </div>

      <div style={{ marginTop: "24px", display: "flex", gap: "8px" }}>
        {ticket.status === "open" && (
          <button
            onClick={() => start(ticket.id)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#e67e22",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Start
          </button>
        )}
        {(ticket.status === "open" || ticket.status === "in_progress") && (
          <button
            onClick={() => close(ticket.id)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#27ae60",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        )}
        {ticket.status === "closed" && (
          <button
            onClick={() => reopen(ticket.id)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#3498db",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Reopen
          </button>
        )}
      </div>
    </div>
  );
}
