import { useState } from "react";
import { useParams } from "react-router-dom";
import { useServices, type Service } from "../hooks/useServices.ts";
import { ServiceCreateModal } from "./ServiceCreateModal.tsx";
import { ServiceEditModal } from "./ServiceEditModal.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { ServicesTable } from "./ServicesTable.tsx";
import { LogsTable } from "./LogsTable.tsx";
import { colors, fonts, radius, buttonPrimary, buttonSecondary } from "../theme.ts";

export function ServicesView() {
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
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);

  const isBusy = isStarting || isStopping || isRestarting || isDeleting;

  const isServiceRunning = (service: Service) =>
    service.status === "running" || service.status === "starting" || service.status === "restarting";

  const handleDelete = (service: Service) => {
    setDeletingService(service);
  };

  const confirmDelete = async () => {
    if (!deletingService) return;

    if (isServiceRunning(deletingService)) {
      await stop(deletingService.id);
      await new Promise((r) => setTimeout(r, 500));
    }

    remove(deletingService.id, {
      onSuccess: () => setDeletingService(null),
    });
  };

  const selectedService = services.find((s) => s.id === selectedServiceId);

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
            Install tmux to manage services. Run:{" "}
            <code style={{ fontFamily: fonts.mono }}>brew install tmux</code>
          </p>
        </div>
      </div>
    );
  }

  const showLogs = selectedService && (selectedService.status === "running" || selectedService.status === "unhealthy");

  return (
    <div
      style={{
        padding: 24,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexShrink: 0,
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
        <button onClick={() => setShowCreateModal(true)} style={buttonPrimary}>
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
            minHeight: 0,
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <ServicesTable
              services={services}
              isBusy={isBusy}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
              onStart={start}
              onStop={stop}
              onRestart={restart}
              onEdit={setEditingService}
              onDelete={handleDelete}
            />
          </div>

          {showLogs && (
            <LogsTable
              projectId={projectId!}
              serviceId={selectedService.id}
              serviceName={selectedService.name}
            />
          )}
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
