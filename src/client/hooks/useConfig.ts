import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ProjectConfig {
  name: string;
  path: string;
}

async function fetchProjects(): Promise<ProjectConfig[]> {
  const res = await fetch("/api/config/projects");
  if (!res.ok) {
    throw new Error("Failed to fetch config");
  }
  return res.json();
}

export function useConfigProjects() {
  return useQuery({
    queryKey: ["config", "projects"],
    queryFn: fetchProjects,
  });
}

async function addProject(project: ProjectConfig): Promise<ProjectConfig[]> {
  const res = await fetch("/api/config/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to add project");
  }
  return res.json();
}

async function removeProject(name: string): Promise<ProjectConfig[]> {
  const res = await fetch(`/api/config/projects/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || "Failed to remove project");
  }
  return res.json();
}

export function useAddProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useRemoveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: removeProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config", "projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
