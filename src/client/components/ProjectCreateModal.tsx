import { useState } from "react";
import { SlideOutPanel } from "./SlideOutPanel.tsx";
import { ProjectForm } from "./ProjectForm.tsx";
import { useAddProject, type ProjectConfig } from "../hooks/useConfig.ts";

interface ProjectCreateModalProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectCreateModal({ open, onClose }: ProjectCreateModalProps) {
  const addMutation = useAddProject();
  const [error, setError] = useState<string | undefined>();

  const handleSubmit = (data: ProjectConfig) => {
    setError(undefined);
    addMutation.mutate(data, {
      onSuccess: () => {
        onClose();
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : "Failed to add project");
      },
    });
  };

  const handleClose = () => {
    setError(undefined);
    onClose();
  };

  return (
    <SlideOutPanel open={open} onClose={handleClose} width={450}>
      <ProjectForm
        isEditMode={false}
        onSubmit={handleSubmit}
        onCancel={handleClose}
        isPending={addMutation.isPending}
        error={error}
      />
    </SlideOutPanel>
  );
}
