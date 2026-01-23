import { useState, useRef, useEffect } from "react";
import { useServices, type Service, type ServiceStatus } from "../hooks/useServices.ts";
import { colors, radius } from "../theme.ts";
import { ServiceCreateModal } from "./ServiceCreateModal.tsx";
import { ServiceEditModal } from "./ServiceEditModal.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
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

  const handleDelete = (service: Service) => {
    setDeleteError(null);
    setDeletingService(service);
  };

  const confirmDelete = () => {
    if (!deletingService) return;

    remove(deletingService.id, {
      onSuccess: () => {
        setDeletingService(null);
        setDeleteError(null);
      },
      onError: (err) => {
        setDeleteError(err instanceof Error ? err.message : "Failed to delete service");
      },
    });
  };

  if (isLoading) {
    return null;
  }

  const aggregate = getAggregateStatus(services);
  const isBusy = isStarting || isStopping || isRestarting || isDeleting;
  const isServiceRunning = (service: Service) =>
    service.status === "running" || service.status === "starting" || service.status === "restarting";

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
            <>
              {services.map((service) => (
                <ServiceRow
                  key={service.id}
                  service={service}
                  isBusy={isBusy}
                  onStart={() => start(service.id)}
                  onStop={() => stop(service.id)}
                  onRestart={() => restart(service.id)}
                  onViewLogs={() => onViewLogs?.(service.id)}
                  onEdit={() => {
                    setEditingService(service);
                    setIsOpen(false);
                  }}
                  onDelete={() => handleDelete(service)}
                  isRunning={isServiceRunning(service)}
                />
              ))}
              {services.length === 0 && (
                <div
                  style={{
                    padding: 12,
                    color: colors.textMuted,
                    textAlign: "center",
                    fontSize: 13,
                  }}
                >
                  No services configured
                </div>
              )}
              <button
                onClick={() => {
                  setShowCreateModal(true);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                  padding: "10px 12px",
                  marginTop: 8,
                  backgroundColor: "transparent",
                  border: `1px dashed ${colors.border}`,
                  borderRadius: radius.sm,
                  color: colors.textSecondary,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                + Add Service
              </button>
            </>
          )}
        </div>
      )}

      <ServiceCreateModal
        projectId={projectId}
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      <ServiceEditModal
        projectId={projectId}
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
        onCancel={() => {
          setDeletingService(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}

interface ServiceRowProps {
  service: Service;
  isBusy: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onViewLogs: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ServiceRow({
  service,
  isBusy,
  isRunning,
  onStart,
  onStop,
  onRestart,
  onViewLogs,
  onEdit,
  onDelete,
}: ServiceRowProps) {
  const statusRunning = service.status === "running";
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
        {statusRunning && (
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
        {(statusRunning || service.status === "unhealthy") && (
          <ActionButton
            onClick={onViewLogs}
            disabled={false}
            title="View Logs"
            color={colors.textSecondary}
          >
            📋
          </ActionButton>
        )}
        <ActionButton
          onClick={onEdit}
          disabled={false}
          title="Edit"
          color={colors.textSecondary}
        >
          ⚙
        </ActionButton>
        <ActionButton
          onClick={onDelete}
          disabled={isBusy || isRunning}
          title={isRunning ? "Stop service to delete" : "Delete"}
          color={colors.danger}
        >
          🗑
        </ActionButton>
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
