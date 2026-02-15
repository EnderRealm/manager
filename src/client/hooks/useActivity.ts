import { useQuery } from "@tanstack/react-query";

export interface ProjectActivity {
  name: string;
  tokenCount: number;
  messageCount: number;
  sessions: number;
}

export interface DayActivity {
  date: string;
  projects: ProjectActivity[];
  total: number;
}

async function fetchActivity(
  range: string
): Promise<{ days: DayActivity[] }> {
  const res = await fetch(`/api/activity?range=${range}`);
  if (!res.ok) throw new Error("Failed to fetch activity");
  return res.json();
}

export function useActivity(range: "year" | "6months" | "3months" = "year") {
  return useQuery({
    queryKey: ["activity", range],
    queryFn: () => fetchActivity(range),
    staleTime: 5 * 60 * 1000,
  });
}
