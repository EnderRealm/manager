import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ServiceStatus =
  | "stopped"
  | "starting"
  | "running"
  | "unhealthy"
  | "crashed"
  | "restarting";

export interface Service {
  id: string;
  name: string;
  cmd: string;
  port?: number;
  healthUrl?: string;
  autoStart: boolean;
  autoRestart: boolean;
  status: ServiceStatus;
  lastHealthCheck?: number;
  lastError?: string;
  sessionName: string;
}

export interface ServicesResponse {
  tmuxAvailable: boolean;
  services: Service[];
}

async function fetchServices(projectId: string): Promise<ServicesResponse> {
  const res = await fetch(`/api/projects/${projectId}/services`);
  if (!res.ok) {
    throw new Error("Failed to fetch services");
  }
  return res.json();
}

async function startService(projectId: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}/start`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to start service");
  }
}

async function stopService(projectId: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to stop service");
  }
}

async function restartService(projectId: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}/restart`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to restart service");
  }
}

export function useServices(projectId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["services", projectId],
    queryFn: () => fetchServices(projectId),
    refetchOnWindowFocus: true,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["services", projectId] });
  };

  const startMutation = useMutation({
    mutationFn: (serviceId: string) => startService(projectId, serviceId),
    onSuccess: invalidate,
  });

  const stopMutation = useMutation({
    mutationFn: (serviceId: string) => stopService(projectId, serviceId),
    onSuccess: invalidate,
  });

  const restartMutation = useMutation({
    mutationFn: (serviceId: string) => restartService(projectId, serviceId),
    onSuccess: invalidate,
  });

  return {
    tmuxAvailable: query.data?.tmuxAvailable ?? false,
    services: query.data?.services ?? [],
    isLoading: query.isLoading,
    error: query.error,
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    restart: restartMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isRestarting: restartMutation.isPending,
    invalidate,
  };
}
