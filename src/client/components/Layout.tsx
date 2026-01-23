import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useParams, useLocation, useNavigate } from "react-router-dom";
import { colors, fonts, radius } from "../theme.ts";
import { useProjects, type ProjectSummary } from "../hooks/useProjects.ts";
import { useTicketEvents } from "../hooks/useTicketEvents.ts";

const sidebarWidth = 240;
const headerHeight = 48;
const mobileBreakpoint = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < mobileBreakpoint
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

function ProjectSwitcher({
  currentProject,
  projects,
}: {
  currentProject: ProjectSummary;
  projects: ProjectSummary[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectProject = (projectId: string) => {
    setIsOpen(false);
    navigate(`/projects/${projectId}`);
  };

  // Sort projects: current first, then alphabetically
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.id === currentProject.id) return -1;
    if (b.id === currentProject.id) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          padding: "4px 8px",
          margin: "-4px -8px",
          borderRadius: radius.sm,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: colors.textSecondary,
          fontSize: 14,
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = colors.overlay;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {currentProject.name}
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: -8,
            marginTop: 8,
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: 4,
            zIndex: 200,
            minWidth: 200,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {sortedProjects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelectProject(project.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "8px 10px",
                border: "none",
                borderRadius: radius.sm,
                cursor: "pointer",
                backgroundColor:
                  project.id === currentProject.id ? colors.overlay : "transparent",
                color: colors.textPrimary,
                fontSize: 13,
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (project.id !== currentProject.id) {
                  e.currentTarget.style.backgroundColor = colors.overlay;
                }
              }}
              onMouseLeave={(e) => {
                if (project.id !== currentProject.id) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {project.name}
              </span>
              {project.hasTk && project.ticketCounts.inProgress + project.ticketCounts.ready > 0 && (
                <span
                  style={{
                    fontSize: 11,
                    color: colors.textMuted,
                    backgroundColor: colors.canvas,
                    padding: "2px 6px",
                    borderRadius: radius.sm,
                  }}
                >
                  {project.ticketCounts.inProgress + project.ticketCounts.ready}
                </span>
              )}
              {project.id === currentProject.id && (
                <span style={{ color: colors.success, fontSize: 12 }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Layout() {
  const { id: projectId, ticketId } = useParams();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === projectId);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Subscribe to SSE ticket events for current project
  useTicketEvents(projectId);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: colors.canvas,
        fontFamily: fonts.sans,
      }}
    >
      {/* Header */}
      <header
        style={{
          height: headerHeight,
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          flexShrink: 0,
        }}
      >
        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              color: colors.textSecondary,
              fontSize: 20,
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: colors.success, fontSize: 20 }}>◆</span>
          <span style={{ color: colors.textPrimary, fontWeight: 600, fontSize: 14 }}>
            Manager
          </span>
        </div>

        {currentProject && projects && (
          <>
            <span style={{ color: colors.textMuted }}>/</span>
            <ProjectSwitcher currentProject={currentProject} projects={projects} />
          </>
        )}

        {ticketId && (
          <>
            <span style={{ color: colors.textMuted }}>/</span>
            <span
              style={{
                color: colors.textPrimary,
                fontSize: 14,
                fontFamily: fonts.mono,
              }}
            >
              {ticketId}
            </span>
          </>
        )}

        <div style={{ flex: 1 }} />

        <button
          style={{
            backgroundColor: colors.overlay,
            border: `1px solid ${colors.border}`,
            borderRadius: 6,
            padding: "6px 12px",
            color: colors.textSecondary,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>Search...</span>
          <span
            style={{
              backgroundColor: colors.surfaceRaised,
              padding: "2px 6px",
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            ⌘K
          </span>
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Mobile overlay backdrop */}
        {isMobile && menuOpen && (
          <div
            onClick={() => setMenuOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              zIndex: 10,
            }}
          />
        )}

        {/* Sidebar */}
        <nav
          style={{
            width: sidebarWidth,
            backgroundColor: colors.surface,
            borderRight: `1px solid ${colors.border}`,
            padding: "12px 0",
            flexShrink: 0,
            overflowY: "auto",
            // Mobile: absolute positioning, hidden by default
            ...(isMobile
              ? {
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  zIndex: 20,
                  transform: menuOpen ? "translateX(0)" : "translateX(-100%)",
                  transition: "transform 0.2s ease-in-out",
                }
              : {}),
          }}
        >
          <NavSection>
            <NavItem to="/" icon="⊞">
              Projects
            </NavItem>
          </NavSection>

          {currentProject && (
            <NavSection title="Project">
              <NavItem to={`/projects/${projectId}`} icon="▤">
                Board
              </NavItem>
              <NavItem to={`/projects/${projectId}/tickets/new`} icon="+">
                New Ticket
              </NavItem>
            </NavSection>
          )}

          <NavSection title="Settings">
            <NavItem to="/settings" icon="⚙">
              Configuration
            </NavItem>
          </NavSection>
        </nav>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            overflowX: "hidden",
            overflowY: "auto",
            backgroundColor: colors.canvas,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function NavSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      {title && (
        <div
          style={{
            padding: "8px 16px 4px",
            fontSize: 11,
            fontWeight: 500,
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function NavItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end
      style={({ isActive }) => ({
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 16px",
        fontSize: 14,
        color: isActive ? colors.textPrimary : colors.textSecondary,
        backgroundColor: isActive ? colors.overlay : "transparent",
        textDecoration: "none",
        borderLeft: isActive
          ? `2px solid ${colors.success}`
          : "2px solid transparent",
        marginLeft: -2,
      })}
    >
      <span style={{ width: 16, textAlign: "center" }}>{icon}</span>
      {children}
    </NavLink>
  );
}
