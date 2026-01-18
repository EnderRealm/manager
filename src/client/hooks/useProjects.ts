import { useQuery } from "@tanstack/react-query";
import { getProjects, type Project } from "../lib/api.ts";

export interface TicketCounts {
  inProgress: number;
  ready: number;
  blocked: number;
  open: number;
  closed: number;
}

export interface GitInfo {
  branch: string | null;
  isDirty: boolean;
  ahead: number;
  behind: number;
  unstaged: number;
  untracked: number;
}

export interface LanguageBreakdown {
  language: string;
  percentage: number;
  color: string;
}

export interface LanguageInfo {
  primary: string;
  breakdown: LanguageBreakdown[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  path: string;
  git: GitInfo;
  languages: LanguageInfo;
  hasTk: boolean;
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
