import type { Ticket } from "../hooks/useTickets.ts";

interface TicketCardProps {
  ticket: Ticket;
  onStart?: () => void;
  onClose?: () => void;
  onReopen?: () => void;
  onClick?: () => void;
}

const typeColors: Record<string, string> = {
  epic: "#9b59b6",
  feature: "#3498db",
  task: "#2ecc71",
  bug: "#e74c3c",
  chore: "#95a5a6",
};

const priorityColors: Record<number, string> = {
  0: "#e74c3c",
  1: "#e67e22",
  2: "#f1c40f",
  3: "#3498db",
  4: "#95a5a6",
};

export function TicketCard({
  ticket,
  onStart,
  onClose,
  onReopen,
  onClick,
}: TicketCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        border: "1px solid #ddd",
        borderRadius: "6px",
        padding: "12px",
        marginBottom: "8px",
        backgroundColor: "#fff",
        cursor: onClick ? "pointer" : "default",
        borderLeft: `4px solid ${priorityColors[ticket.priority] ?? "#95a5a6"}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ color: "#666", fontSize: "12px", fontFamily: "monospace" }}>
          {ticket.id}
        </span>
        <span
          style={{
            backgroundColor: typeColors[ticket.type] ?? "#95a5a6",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            textTransform: "uppercase",
          }}
        >
          {ticket.type}
        </span>
      </div>

      <div style={{ marginTop: "8px", fontWeight: 500 }}>
        {ticket.title || "(no title)"}
      </div>

      {(onStart || onClose || onReopen) && (
        <div
          style={{ marginTop: "12px", display: "flex", gap: "8px" }}
          onClick={(e) => e.stopPropagation()}
        >
          {onStart && ticket.status === "open" && (
            <button
              onClick={onStart}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
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
          {onClose && (ticket.status === "open" || ticket.status === "in_progress") && (
            <button
              onClick={onClose}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
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
          {onReopen && ticket.status === "closed" && (
            <button
              onClick={onReopen}
              style={{
                padding: "4px 8px",
                fontSize: "12px",
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
      )}
    </div>
  );
}
