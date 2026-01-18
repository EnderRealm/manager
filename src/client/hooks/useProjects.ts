import { useQuery } from "@tanstack/react-query";
import { getProjects, type Project } from "../lib/api.ts";

export interface TicketCounts {
  inProgress: number;
  ready: number;
  blocked: number;
  open: number;
  closed: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  branch: string | null;
  isDirty: boolean;
  language: string;
  ticketCounts: TicketCounts;
}

async function fetchProjects(): Promise<ProjectSummary[]> {
  const res = await fetch("/api/projects");
  if (!res.ok) {
    throw new Error("Failed to fetch projects");
  }
  return res.json();
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}
