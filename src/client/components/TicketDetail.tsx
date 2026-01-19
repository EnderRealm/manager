import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTicket, useTicketMutations, useAllTickets, type Ticket } from "../hooks/useTickets.ts";
import { colors, fonts, radius, typeColors, statusColors } from "../theme.ts";

type TabId = "detail" | "raw";

function Tab({
  id,
  label,
  active,
  onClick,
}: {
  id: TabId;
  label: string;
  active: boolean;
  onClick: (id: TabId) => void;
}) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        padding: "8px 16px",
        fontSize: 14,
        fontWeight: 500,
        color: active ? colors.textPrimary : colors.textMuted,
        backgroundColor: "transparent",
        border: "none",
        borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
        cursor: "pointer",
        marginBottom: -1,
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function Tabs({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (id: TabId) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: 24,
      }}
    >
      <Tab id="detail" label="Detail" active={activeTab === "detail"} onClick={onTabChange} />
      <Tab id="raw" label="Raw" active={activeTab === "raw"} onClick={onTabChange} />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 14,
        fontWeight: 600,
        color: colors.textPrimary,
        marginBottom: 12,
        marginTop: 0,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {children}
    </h3>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 24,
        padding: 16,
        backgroundColor: colors.surface,
        border: `1px solid ${colors.borderMuted}`,
        borderRadius: radius.md,
      }}
    >
      <SectionHeader>{title}</SectionHeader>
      {children}
    </div>
  );
}

interface DependencyTreeItemProps {
  ticketId: string;
  allTickets: Ticket[];
  depth: number;
  visited: Set<string>;
  projectId: string;
  onTicketClick?: (ticketId: string) => void;
}

function DependencyTreeItem({
  ticketId,
  allTickets,
  depth,
  visited,
  projectId,
  onTicketClick,
}: DependencyTreeItemProps) {
  const ticket = allTickets.find((t) => t.id === ticketId);

  // Prevent infinite loops from circular dependencies
  if (visited.has(ticketId)) {
    return (
      <div style={{ marginLeft: depth * 16, color: colors.textMuted, fontStyle: "italic" }}>
        {ticketId} (circular reference)
      </div>
    );
  }

  const newVisited = new Set(visited);
  newVisited.add(ticketId);

  const handleClick = (e: React.MouseEvent) => {
    if (onTicketClick) {
      e.preventDefault();
      onTicketClick(ticketId);
    }
  };

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <Link
        to={`/projects/${projectId}/tickets/${ticketId}`}
        onClick={handleClick}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          backgroundColor: colors.overlay,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          color: colors.accent,
          fontFamily: fonts.mono,
          fontSize: 12,
          textDecoration: "none",
          marginBottom: 6,
        }}
      >
        <span>{ticketId}</span>
        {ticket && (
          <span
            style={{
              color: colors.textSecondary,
              fontFamily: fonts.sans,
              fontSize: 12,
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {ticket.title || "(no title)"}
          </span>
        )}
      </Link>
      {ticket && ticket.deps.length > 0 && (
        <div>
          {ticket.deps.map((depId) => (
            <DependencyTreeItem
              key={depId}
              ticketId={depId}
              allTickets={allTickets}
              depth={depth + 1}
              visited={newVisited}
              projectId={projectId}
              onTicketClick={onTicketClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DependencyTreeProps {
  deps: string[];
  allTickets: Ticket[];
  projectId: string;
  onTicketClick?: (ticketId: string) => void;
}

function DependencyTree({ deps, allTickets, projectId, onTicketClick }: DependencyTreeProps) {
  if (deps.length === 0) {
    return (
      <p style={{ margin: 0, color: colors.textMuted, fontStyle: "italic" }}>
        No dependencies
      </p>
    );
  }

  return (
    <div>
      {deps.map((depId) => (
        <DependencyTreeItem
          key={depId}
          ticketId={depId}
          allTickets={allTickets}
          depth={0}
          visited={new Set()}
          projectId={projectId}
          onTicketClick={onTicketClick}
        />
      ))}
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          style={{
            margin: "8px 0",
            paddingLeft: 20,
            color: colors.textSecondary,
            lineHeight: 1.6,
          }}
        >
          {listItems.map((item, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              {item}
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const listMatch = line.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(listMatch[1]!);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <p
            key={`p-${i}`}
            style={{
              margin: "8px 0",
              color: colors.textSecondary,
              lineHeight: 1.6,
            }}
          >
            {line}
          </p>
        );
      }
    }
  }
  flushList();

  return <div style={{ marginTop: -8 }}>{elements}</div>;
}

interface TicketDetailContentProps {
  projectId: string;
  ticketId: string;
  onTicketClick?: (ticketId: string) => void;
}

export function TicketDetailContent({
  projectId,
  ticketId,
  onTicketClick,
}: TicketDetailContentProps) {
  const { data: ticket, isLoading, error } = useTicket(projectId, ticketId);
  const { data: allTickets } = useAllTickets(projectId);
  const { start, close, reopen } = useTicketMutations(projectId);
  const [activeTab, setActiveTab] = useState<TabId>("detail");

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
      <div style={{ padding: 24, color: colors.textSecondary }}>
        Loading ticket...
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: 24, color: colors.danger }}>
        Error loading ticket
      </div>
    );
  }

  const handleChildClick = (childId: string, e: React.MouseEvent) => {
    if (onTicketClick) {
      e.preventDefault();
      onTicketClick(childId);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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
            <div style={{ color: colors.textMuted }}>Blockers</div>
            <div style={{ color: colors.textSecondary }}>{ticket.deps.length} ticket(s)</div>
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

      <div style={{ marginTop: 24 }}>
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {activeTab === "detail" && (
        <>
          <Section title="Description">
            <p
              style={{
                margin: 0,
                color: ticket.description ? colors.textSecondary : colors.textMuted,
                lineHeight: 1.6,
                fontStyle: ticket.description ? "normal" : "italic",
              }}
            >
              {ticket.description || "No description"}
            </p>
          </Section>

          <Section title="Design">
            {ticket.design ? (
              <MarkdownContent content={ticket.design} />
            ) : (
              <p style={{ margin: 0, color: colors.textMuted, fontStyle: "italic" }}>
                No design notes
              </p>
            )}
          </Section>

          <Section title="Acceptance Criteria">
            {ticket.acceptanceCriteria ? (
              <MarkdownContent content={ticket.acceptanceCriteria} />
            ) : (
              <p style={{ margin: 0, color: colors.textMuted, fontStyle: "italic" }}>
                No acceptance criteria
              </p>
            )}
          </Section>

          <Section title="Dependencies">
            <DependencyTree
              deps={ticket.deps}
              allTickets={allTickets ?? []}
              projectId={projectId}
              onTicketClick={onTicketClick}
            />
          </Section>

          <Section title="Children">
            {ticket.children && ticket.children.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ticket.children.map((childId) => (
                  <Link
                    key={childId}
                    to={`/projects/${projectId}/tickets/${childId}`}
                    onClick={(e) => handleChildClick(childId, e)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      backgroundColor: colors.overlay,
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.sm,
                      color: colors.accent,
                      fontFamily: fonts.mono,
                      fontSize: 13,
                      textDecoration: "none",
                      width: "fit-content",
                    }}
                  >
                    {childId}
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: colors.textMuted, fontStyle: "italic" }}>
                No child tickets
              </p>
            )}
          </Section>
        </>
      )}

      {activeTab === "raw" && (
        <pre
          style={{
            margin: 0,
            padding: 16,
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            overflow: "auto",
            fontSize: 13,
            lineHeight: 1.6,
            color: ticket.rawContent ? colors.textSecondary : colors.textMuted,
            fontFamily: fonts.mono,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontStyle: ticket.rawContent ? "normal" : "italic",
          }}
        >
          {ticket.rawContent || "No raw content available"}
        </pre>
      )}

      <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
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

// Page wrapper that uses URL params
export function TicketDetail() {
  const { id: projectId, ticketId } = useParams<{
    id: string;
    ticketId: string;
  }>();

  if (!projectId || !ticketId) {
    return (
      <div style={{ padding: 24, color: colors.danger }}>
        Missing project or ticket ID
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <TicketDetailContent projectId={projectId} ticketId={ticketId} />
    </div>
  );
}
