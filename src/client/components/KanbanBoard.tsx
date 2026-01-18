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
import { colors, fonts, radius, buttonSecondary, buttonPrimary } from "../theme.ts";

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
        minWidth: "280px",
        backgroundColor: colors.canvas,
        borderRadius: radius.lg,
        padding: "12px",
        border: `1px solid ${colors.borderMuted}`,
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
        <h3 style={{ margin: 0, color, fontFamily: fonts.sans, fontSize: "14px", fontWeight: 600 }}>
          {title}
        </h3>
        <span
          style={{
            backgroundColor: color,
            color: colors.canvas,
            padding: "2px 8px",
            borderRadius: "12px",
            fontSize: "12px",
            fontWeight: 600,
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
          <div style={{ color: colors.textMuted, textAlign: "center", padding: "20px", fontSize: "14px" }}>
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
    <div style={{ padding: "24px", fontFamily: fonts.sans }}>
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
          style={buttonSecondary}
        >
          ← Back
        </button>
        <h1 style={{ margin: 0, color: colors.textPrimary }}>{projectId}</h1>
        <button
          onClick={() => navigate(`/projects/${projectId}/tickets/new`)}
          style={{ ...buttonPrimary, marginLeft: "auto" }}
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
          color={colors.warning}
          onClose={close}
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Ready"
          tickets={readyTickets ?? []}
          color={colors.success}
          onStart={start}
          onClose={close}
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Blocked"
          tickets={blockedTickets ?? []}
          color={colors.danger}
          onTicketClick={handleTicketClick}
        />
        <Column
          title="Closed"
          tickets={closedTickets ?? []}
          color={colors.textMuted}
          onReopen={reopen}
          onTicketClick={handleTicketClick}
        />
      </div>
    </div>
  );
}
