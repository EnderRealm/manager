import { useQuery } from "@tanstack/react-query";

export interface LearningEntry {
  text: string;
  project: string;
  date: string;
}

export interface RollupData {
  level: string;
  date: string;
  projects: string[];
  sessions: number;
  messageCount: number;
  toolUses: number;
  filesTouched: number;
  patternsActive: string[];
  body: string;
}

export interface LearningsResponse {
  rollup: RollupData | null;
  recentDiscoveries: LearningEntry[];
  recentDecisions: LearningEntry[];
}

async function fetchLearnings(
  period: string
): Promise<LearningsResponse> {
  const res = await fetch(`/api/learnings?period=${period}`);
  if (!res.ok) throw new Error("Failed to fetch learnings");
  return res.json();
}

export function useLearnings(period: "week" | "month" = "week") {
  return useQuery({
    queryKey: ["learnings", period],
    queryFn: () => fetchLearnings(period),
    staleTime: 5 * 60 * 1000,
  });
}
