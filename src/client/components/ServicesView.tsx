import { useState } from "react";
import { useParams } from "react-router-dom";
import { useServices, type Service, type ServiceStatus } from "../hooks/useServices.ts";
import { ServiceCreateModal } from "./ServiceCreateModal.tsx";
import { ServiceEditModal } from "./ServiceEditModal.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { colors, fonts, radius, buttonPrimary, buttonSecondary } from "../theme.ts";

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
  starting: "Starting",
  running: "Running",
  unhealthy: "Unhealthy",
  crashed: "Crashed",
  restarting: "Restarting",
};

function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function formatMemory(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface ServicesViewProps {
  onViewLogs?: (serviceId: string) => void;
}

export function ServicesView({ onViewLogs }: ServicesViewProps) {
  const { id: projectId } = useParams<{ id: string }>();
  const {
    tmuxAvailable,
    services,
    isLoading,
    start,
    stop,
    restart,
    remove,
    isStarting,
    isStopping,
    isRestarting,
    isDeleting,
  } = useServices(projectId!);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);

  const isBusy = isStarting || isStopping || isRestarting || isDeleting;

  const isServiceRunning = (service: Service) =>
    service.status === "running" || service.status === "starting" || service.status === "restarting";

  const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const confirmDelete = async () => {
    if (!deletingService) return;

    // Stop first if running
    if (isServiceRunning(deletingService)) {
      await stop(deletingService.id);
      // Small delay to let the service stop
      await new Promise(r => setTimeout(r, 500));
    }

    remove(deletingService.id, {
      onSuccess: () => setDeletingService(null),
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: colors.textMuted }}>
        Loading services...
      </div>
    );
  }

  if (!tmuxAvailable) {
    return (
      <div style={{ padding: 24 }}>
        <div
          style={{
            padding: 24,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 8px", color: colors.textPrimary, fontSize: 18 }}>
            tmux not installed
          </h2>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: 14 }}>
            Install tmux to manage services. Run: <code style={{ fontFamily: fonts.mono }}>brew install tmux</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, height: "100%", overflow: "auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 600,
            color: colors.textPrimary,
          }}
        >
          Services
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={buttonPrimary}
        >
          + Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div
          style={{
            padding: 48,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            border: `1px dashed ${colors.border}`,
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 16px", color: colors.textSecondary, fontSize: 14 }}>
            No services configured for this project.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{ ...buttonSecondary, padding: "10px 20px" }}
          >
            Add your first service
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isBusy={isBusy}
              onStart={() => start(service.id)}
              onStop={() => stop(service.id)}
              onRestart={() => restart(service.id)}
              onEdit={() => setEditingService(service)}
              onDelete={() => handleDelete(service)}
              onViewLogs={() => onViewLogs?.(service.id)}
            />
          ))}
        </div>
      )}

      <ServiceCreateModal
        projectId={projectId!}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <ServiceEditModal
        projectId={projectId!}
        service={editingService}
        open={editingService !== null}
        onClose={() => setEditingService(null)}
      />

      <ConfirmDialog
        open={deletingService !== null}
        title="Delete Service"
        message={
          deletingService
            ? isServiceRunning(deletingService)
              ? `"${deletingService.name}" is currently running. It will be stopped and then deleted. This cannot be undone.`
              : `Are you sure you want to delete "${deletingService.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingService(null)}
      />
    </div>
  );
}

interface ServiceCardProps {
  service: Service;
  isBusy: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewLogs: () => void;
}

function ServiceCard({
  service,
  isBusy,
  onStart,
  onStop,
  onRestart,
  onEdit,
  onDelete,
  onViewLogs,
}: ServiceCardProps) {
  const isRunning = service.status === "running";
  const isStopped = service.status === "stopped" || service.status === "crashed";
  const isTransitioning = service.status === "starting" || service.status === "restarting";

  // Build metadata items for the info line
  const metaItems: string[] = [];
  if (service.stats) {
    metaItems.push(`Up ${formatUptime(service.stats.uptime)}`);
    metaItems.push(formatMemory(service.stats.memory));
  }
  if (service.port) {
    metaItems.push(`Port ${service.port}`);
  }
  if (service.cwd && service.cwd !== ".") {
    metaItems.push(service.cwd);
  }
  if (service.autoRestart) {
    metaItems.push("Auto-restart");
  }
  if (service.autoStart) {
    metaItems.push("Auto-start");
  }

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: "14px 16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Status indicator */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: statusColors[service.status],
            marginTop: 5,
            flexShrink: 0,
          }}
        />

        {/* Service info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header row: name, badges, status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: fonts.mono,
                color: colors.textPrimary,
                letterSpacing: "-0.01em",
              }}
            >
              {service.name}
            </h3>
            {service.type === "agent" && (
              <span
                style={{
                  padding: "2px 6px",
                  fontSize: 10,
                  fontWeight: 500,
                  fontFamily: fonts.mono,
                  backgroundColor: colors.accentEmphasis,
                  color: colors.accent,
                  borderRadius: radius.sm,
                  textTransform: "lowercase",
                }}
              >
                agent
              </span>
            )}
            {service.status !== "running" && (
              <span
                style={{
                  fontSize: 11,
                  fontFamily: fonts.mono,
                  color: statusColors[service.status],
                  fontWeight: 500,
                  textTransform: "lowercase",
                }}
              >
                {statusLabels[service.status]}
              </span>
            )}
          </div>

          {/* Command */}
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 6,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {service.cmd}
          </div>

          {/* Unified metadata line */}
          {metaItems.length > 0 && (
            <div
              style={{
                fontSize: 12,
                fontFamily: fonts.mono,
                color: colors.textSecondary,
              }}
            >
              {metaItems.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span style={{ margin: "0 6px", color: colors.textMuted }}>·</span>}
                  {item}
                </span>
              ))}
              {service.stats && (
                <span
                  style={{ marginLeft: 10, color: colors.textMuted, fontSize: 11 }}
                  title={`Process ID: ${service.stats.pid}`}
                >
                  pid {service.stats.pid}
                </span>
              )}
            </div>
          )}

          {service.lastError && service.status === "crashed" && (
            <div
              style={{
                marginTop: 8,
                padding: 8,
                backgroundColor: `${colors.danger}15`,
                borderRadius: radius.sm,
                fontSize: 12,
                color: colors.danger,
                fontFamily: fonts.mono,
              }}
            >
              {service.lastError}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {isStopped && (
            <ActionButton onClick={onStart} disabled={isBusy} color={colors.success}>
              Start
            </ActionButton>
          )}
          {isRunning && (
            <>
              <ActionButton onClick={onRestart} disabled={isBusy} color={colors.warning}>
                Restart
              </ActionButton>
              <ActionButton onClick={onStop} disabled={isBusy} color={colors.danger}>
                Stop
              </ActionButton>
            </>
          )}
          {isTransitioning && (
            <span style={{ padding: "6px 10px", color: colors.textMuted, fontSize: 12 }}>
              ...
            </span>
          )}
          {(isRunning || service.status === "unhealthy") && (
            <ActionButton onClick={onViewLogs} disabled={false} color={colors.textSecondary}>
              Logs
            </ActionButton>
          )}
          <ActionButton onClick={onEdit} disabled={false} color={colors.textSecondary}>
            Edit
          </ActionButton>
          <ActionButton onClick={onDelete} disabled={isBusy} color={colors.danger}>
            Delete
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  color,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  color: string;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "5px 10px",
        backgroundColor: hovered && !disabled ? colors.overlay : "transparent",
        border: `1px solid ${hovered && !disabled ? colors.textMuted : colors.border}`,
        borderRadius: radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? colors.textMuted : color,
        fontSize: 12,
        fontFamily: fonts.mono,
        fontWeight: 400,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s ease",
        textTransform: "lowercase",
      }}
    >
      {children}
    </button>
  );
}
