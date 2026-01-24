import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type ServiceStatus =
  | "stopped"
  | "starting"
  | "running"
  | "unhealthy"
  | "crashed"
  | "restarting";

export type ServiceType = "service" | "agent";

export interface ProcessStats {
  pid: number;
  cpu: number;
  memory: number; // RSS in bytes
  uptime: number; // seconds
  command: string;
}

export interface Service {
  id: string;
  name: string;
  cmd: string;
  type: ServiceType;
  cwd?: string;
  port?: number;
  healthUrl?: string;
  autoStart: boolean;
  autoRestart: boolean;
  restartDelay?: number;
  maxRestarts?: number;
  env?: Record<string, string>;
  status: ServiceStatus;
  lastHealthCheck?: number;
  lastError?: string;
  sessionName: string;
  stats?: ProcessStats | null;
}

export interface ServiceInput {
  id: string;
  name?: string;
  cmd: string;
  type?: ServiceType;
  cwd?: string;
  port?: number;
  healthUrl?: string;
  autoStart?: boolean;
  autoRestart?: boolean;
  restartDelay?: number;
  maxRestarts?: number;
  env?: Record<string, string>;
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

async function createService(projectId: string, input: ServiceInput): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to create service");
  }
}

async function updateServiceApi(
  projectId: string,
  serviceId: string,
  updates: Partial<Omit<ServiceInput, "id">>
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to update service");
  }
}

async function deleteService(projectId: string, serviceId: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/services/${serviceId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to delete service");
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

  const createMutation = useMutation({
    mutationFn: (input: ServiceInput) => createService(projectId, input),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ serviceId, updates }: { serviceId: string; updates: Partial<Omit<ServiceInput, "id">> }) =>
      updateServiceApi(projectId, serviceId, updates),
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (serviceId: string) => deleteService(projectId, serviceId),
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
    create: createMutation.mutate,
    update: updateMutation.mutate,
    remove: removeMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: removeMutation.isPending,
    invalidate,
  };
}
