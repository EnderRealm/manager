import { useQuery } from "@tanstack/react-query";

export interface Pattern {
  id: string;
  status: string;
  description: string;
  evidence: string[];
  suggestedAction: string;
  occurrences: number;
  projects: string[];
  firstSeen: string;
  lastSeen: string;
}

async function fetchPatterns(
  status?: string
): Promise<{ patterns: Pattern[] }> {
  const url = status ? `/api/patterns?status=${status}` : "/api/patterns";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch patterns");
  return res.json();
}

export function usePatterns(status?: string) {
  return useQuery({
    queryKey: ["patterns", status],
    queryFn: () => fetchPatterns(status),
    staleTime: 5 * 60 * 1000,
  });
}
