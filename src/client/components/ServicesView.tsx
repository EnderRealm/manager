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

  const confirmDelete = () => {
    if (!deletingService) return;
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
              ? `"${deletingService.name}" is currently running. Stop it first before deleting.`
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
  const canDelete = isStopped && !isBusy;

  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {/* Status indicator */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: statusColors[service.status],
            marginTop: 4,
            flexShrink: 0,
          }}
        />

        {/* Service info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 600,
                color: colors.textPrimary,
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
                  backgroundColor: colors.accentEmphasis,
                  color: colors.accent,
                  borderRadius: radius.sm,
                  textTransform: "uppercase",
                }}
              >
                Agent
              </span>
            )}
            <span
              style={{
                fontSize: 12,
                color: statusColors[service.status],
                fontWeight: 500,
              }}
            >
              {statusLabels[service.status]}
            </span>
          </div>

          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 12,
              color: colors.textSecondary,
              marginBottom: 8,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {service.cmd}
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: 12, color: colors.textMuted }}>
            {service.port && <span>Port: {service.port}</span>}
            {service.cwd && service.cwd !== "." && <span>CWD: {service.cwd}</span>}
            {service.autoStart && <span>Auto-start</span>}
            {service.autoRestart && <span>Auto-restart</span>}
          </div>

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
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
            <span style={{ padding: "8px 12px", color: colors.textMuted, fontSize: 13 }}>
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
          <ActionButton onClick={onDelete} disabled={!canDelete} color={colors.danger}>
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
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "6px 12px",
        backgroundColor: "transparent",
        border: `1px solid ${colors.border}`,
        borderRadius: radius.sm,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? colors.textMuted : color,
        fontSize: 13,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        transition: "background-color 0.15s",
      }}
    >
      {children}
    </button>
  );
}
