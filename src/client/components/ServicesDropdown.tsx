import { useState, useRef, useEffect } from "react";
import { useServices, type Service, type ServiceStatus } from "../hooks/useServices.ts";
import { colors, radius } from "../theme.ts";

interface ServicesDropdownProps {
  projectId: string;
  onViewLogs?: (serviceId: string) => void;
}

const statusColors: Record<ServiceStatus, string> = {
  stopped: colors.textMuted,
  starting: colors.warning,
  running: colors.success,
  unhealthy: colors.warning,
  crashed: colors.danger,
  restarting: colors.warning,
};

const statusLabels: Record<ServiceStatus, string> = {
  stopped: "Stopped",
  starting: "Starting...",
  running: "Running",
  unhealthy: "Unhealthy",
  crashed: "Crashed",
  restarting: "Restarting...",
};

function getAggregateStatus(services: Service[]): {
  color: string;
  label: string;
} {
  if (services.length === 0) {
    return { color: colors.textMuted, label: "No services" };
  }

  const hasRunning = services.some((s) => s.status === "running");
  const hasCrashed = services.some((s) => s.status === "crashed");
  const hasUnhealthy = services.some((s) => s.status === "unhealthy");
  const allStopped = services.every((s) => s.status === "stopped");

  if (hasCrashed) {
    return { color: colors.danger, label: "Crashed" };
  }
  if (hasUnhealthy) {
    return { color: colors.warning, label: "Unhealthy" };
  }
  if (allStopped) {
    return { color: colors.textMuted, label: "Stopped" };
  }
  if (hasRunning) {
    const runningCount = services.filter((s) => s.status === "running").length;
    return {
      color: colors.success,
      label: `${runningCount}/${services.length} running`,
    };
  }
  return { color: colors.warning, label: "Starting" };
}

export function ServicesDropdown({ projectId, onViewLogs }: ServicesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const {
    tmuxAvailable,
    services,
    isLoading,
    start,
    stop,
    restart,
    isStarting,
    isStopping,
    isRestarting,
  } = useServices(projectId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (isLoading) {
    return null;
  }

  if (services.length === 0) {
    return null;
  }

  const aggregate = getAggregateStatus(services);
  const isBusy = isStarting || isStopping || isRestarting;

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          backgroundColor: colors.overlay,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.sm,
          cursor: "pointer",
          fontSize: 13,
          color: colors.textSecondary,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: aggregate.color,
          }}
        />
        Services
        <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 8,
            backgroundColor: colors.surfaceRaised,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            padding: 8,
            zIndex: 200,
            minWidth: 280,
            maxHeight: 400,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {!tmuxAvailable ? (
            <div
              style={{
                padding: 12,
                color: colors.textMuted,
                textAlign: "center",
                fontSize: 13,
              }}
            >
              tmux not installed
              <br />
              <span style={{ fontSize: 11 }}>
                Install tmux to manage services
              </span>
            </div>
          ) : (
            services.map((service) => (
              <ServiceRow
                key={service.id}
                service={service}
                isBusy={isBusy}
                onStart={() => start(service.id)}
                onStop={() => stop(service.id)}
                onRestart={() => restart(service.id)}
                onViewLogs={() => onViewLogs?.(service.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

interface ServiceRowProps {
  service: Service;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onViewLogs: () => void;
}

function ServiceRow({
  service,
  isBusy,
  onStart,
  onStop,
  onRestart,
  onViewLogs,
}: ServiceRowProps) {
  const isRunning = service.status === "running";
  const isStopped = service.status === "stopped" || service.status === "crashed";
  const isTransitioning =
    service.status === "starting" || service.status === "restarting";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 4px",
        borderBottom: `1px solid ${colors.borderMuted}`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: statusColors[service.status],
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            color: colors.textPrimary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {service.name}
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted }}>
          {statusLabels[service.status]}
          {service.lastError && service.status === "crashed" && (
            <span style={{ color: colors.danger }}> - {service.lastError}</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {isStopped && (
          <ActionButton
            onClick={onStart}
            disabled={isBusy}
            title="Start"
            color={colors.success}
          >
            ▶
          </ActionButton>
        )}
        {isRunning && (
          <>
            <ActionButton
              onClick={onRestart}
              disabled={isBusy}
              title="Restart"
              color={colors.warning}
            >
              ↻
            </ActionButton>
            <ActionButton
              onClick={onStop}
              disabled={isBusy}
              title="Stop"
              color={colors.danger}
            >
              ⏹
            </ActionButton>
          </>
        )}
        {isTransitioning && (
          <span style={{ color: colors.textMuted, fontSize: 12, padding: "4px 8px" }}>
            ...
          </span>
        )}
        {(isRunning || service.status === "unhealthy") && (
          <ActionButton
            onClick={onViewLogs}
            disabled={false}
            title="View Logs"
            color={colors.textSecondary}
          >
            📋
          </ActionButton>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  disabled: boolean;
  title: string;
  color: string;
  children: React.ReactNode;
}

function ActionButton({ onClick, disabled, title, color, children }: ActionButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={disabled}
      title={title}
      style={{
        padding: "4px 8px",
        backgroundColor: "transparent",
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? colors.textMuted : color,
        fontSize: 12,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}
