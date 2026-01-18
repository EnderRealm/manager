import { useState, useEffect } from "react";
import { NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { colors, fonts } from "../theme.ts";
import { useProjects } from "../hooks/useProjects.ts";

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

export function Layout() {
  const { id: projectId, ticketId } = useParams();
  const { data: projects } = useProjects();
  const currentProject = projects?.find((p) => p.id === projectId);
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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

        {currentProject && (
          <>
            <span style={{ color: colors.textMuted }}>/</span>
            <NavLink
              to={`/projects/${projectId}`}
              style={{
                color: colors.textSecondary,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              {currentProject.name}
            </NavLink>
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
