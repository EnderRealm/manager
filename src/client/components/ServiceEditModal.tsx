import { useState } from "react";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { ServiceForm } from "./ServiceForm.tsx";
import { ConfirmDialog } from "./ConfirmDialog.tsx";
import { useServices, type ServiceInput, type Service } from "../hooks/useServices.ts";
import { colors } from "../theme.ts";

interface ServiceEditModalProps {
  projectId: string;
  service: Service | null;
  open: boolean;
  onClose: () => void;
}

export function ServiceEditModal({ projectId, service, open, onClose }: ServiceEditModalProps) {
  const { update, restart, isUpdating, isRestarting } = useServices(projectId);
  const [error, setError] = useState<string | undefined>();
  const [pendingData, setPendingData] = useState<ServiceInput | null>(null);
  const [showRestartPrompt, setShowRestartPrompt] = useState(false);

  const isRunning = service?.status === "running" || service?.status === "starting";

  const handleSubmit = (data: ServiceInput) => {
    setError(undefined);

    if (isRunning) {
      setPendingData(data);
      setShowRestartPrompt(true);
      return;
    }

    doUpdate(data, false);
  };

  const doUpdate = (data: ServiceInput, shouldRestart: boolean) => {
    if (!service) return;

    const { id: _id, ...updates } = data;

    update(
      { serviceId: service.id, updates },
      {
        onSuccess: () => {
          if (shouldRestart) {
            restart(service.id, {
              onSuccess: () => onClose(),
              onError: (err) => {
                setError(err instanceof Error ? err.message : "Service updated but restart failed");
              },
            });
          } else {
            onClose();
          }
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : "Failed to update service");
        },
      }
    );
  };

  const handleRestartConfirm = () => {
    if (pendingData) {
      doUpdate(pendingData, true);
    }
    setShowRestartPrompt(false);
    setPendingData(null);
  };

  const handleRestartCancel = () => {
    if (pendingData) {
      doUpdate(pendingData, false);
    }
    setShowRestartPrompt(false);
    setPendingData(null);
  };

  const handleClose = () => {
    setError(undefined);
    setPendingData(null);
    setShowRestartPrompt(false);
    onClose();
  };

  if (!service) return null;

  return (
    <>
      <SlideOutPanel open={open} onClose={handleClose} width={500}>
        {isRunning && (
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: colors.warningEmphasis,
              color: colors.textPrimary,
              fontSize: 13,
            }}
          >
            This service is currently running. Changes may require a restart.
          </div>
        )}
        <ServiceForm
          initialData={service}
          isEditMode={true}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isPending={isUpdating || isRestarting}
          error={error}
        />
      </SlideOutPanel>

      <ConfirmDialog
        open={showRestartPrompt}
        title="Restart Service?"
        message="The service is running. Would you like to restart it to apply the changes?"
        confirmLabel="Save & Restart"
        cancelLabel="Save Without Restart"
        onConfirm={handleRestartConfirm}
        onCancel={handleRestartCancel}
      />
    </>
  );
}
