import { useState } from "react";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { ServiceForm } from "./ServiceForm.tsx";
import { useServices, type ServiceInput } from "../hooks/useServices.ts";

interface ServiceCreateModalProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}

export function ServiceCreateModal({ projectId, open, onClose }: ServiceCreateModalProps) {
  const { create, isCreating } = useServices(projectId);
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (data: ServiceInput) => {
    setError(undefined);
    create(data, {
      onSuccess: () => {
        onClose();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to create service");
      },
    });
  };

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  return (
    <SlideOutPanel open={open} onClose={handleClose} width={500}>
      <ServiceForm
        isEditMode={false}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isPending={isCreating}
        error={error}
      />
    </SlideOutPanel>
  );
}
