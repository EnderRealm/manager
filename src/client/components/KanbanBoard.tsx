import { useParams, useNavigate } from "react-router-dom";
import {
  useAllTickets,
  useReadyTickets,
  useBlockedTickets,
  useClosedTickets,
  useTicketMutations,
  type Ticket,
} from "../hooks/useTickets.ts";
import { TicketCard } from "./TicketCard.tsx";

interface ColumnProps {
  title: string;
  tickets: Ticket[];
  color: string;
  onStart?: (id: string) => void;
  onClose?: (id: string) => void;
  onReopen?: (id: string) => void;
  onTicketClick?: (id: string) => void;
}

function Column({
  title,
  tickets,
  color,
  onStart,
  onClose,
  onReopen,
  onTicketClick,
}: ColumnProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: "250px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        padding: "12px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3 style={{ margin: 0, color }}>{title}</h3>
        <span
          style={{
            backgroundColor: color,
            color: "#fff",
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
          }}
        >
          {tickets.length}
        </span>
      </div>
      <div>
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            onStart={onStart ? () => onStart(ticket.id) : undefined}
            onClose={onClose ? () => onClose(ticket.id) : undefined}
            onReopen={onReopen ? () => onReopen(ticket.id) : undefined}
            onClick={onTicketClick ? () => onTicketClick(ticket.id) : undefined}
          />
        ))}
        {tickets.length === 0 && (
          <div style={{ color: "#999", textAlign: "center", padding: "20px" }}>
            No tickets
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: allTickets } = useAllTickets(projectId!);
  const { data: readyTickets } = useReadyTickets(projectId!);
  const { data: blockedTickets } = useBlockedTickets(projectId!);
  const { data: closedTickets } = useClosedTickets(projectId!);
  const { start, close, reopen } = useTicketMutations(projectId!);

  const inProgressTickets =
    allTickets?.filter((t) => t.status === "in_progress") ?? [];

  const handleTicketClick = (ticketId: string) => {
    navigate(`/projects/${projectId}/tickets/${ticketId}`);
  };

  return (
    <div style={{ padding: "24px" }}>
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
        <h1 style={{ margin: 0 }}>{projectId}</h1>
        <button
          onClick={() => navigate(`/projects/${projectId}/tickets/new`)}
          style={{
            marginLeft: "auto",
            padding: "8px 16px",
            backgroundColor: "#3498db",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          + New Ticket
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: "16px",
          overflowX: "auto",
        }}
      >
        <Column
          title="In Progress"
          tickets={inProgressTickets}
          color="#e67e22"
          onClose={close}
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Ready"
          tickets={readyTickets ?? []}
          color="#27ae60"
          onStart={start}
          onClose={close}
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Blocked"
          tickets={blockedTickets ?? []}
          color="#e74c3c"
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Closed"
          tickets={closedTickets ?? []}
          color="#95a5a6"
          onReopen={reopen}
          onTicketClick={handleTicketClick}
        />
      </div>
    </div>
  );
}
