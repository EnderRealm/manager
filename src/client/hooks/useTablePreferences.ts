import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";

export interface TablePreferences {
  columnWidths?: Record<string, number>;
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
}

export interface Preferences {
  servicesTable?: TablePreferences;
  logsTable?: TablePreferences;
}

async function fetchPreferences(): Promise<Preferences> {
  const res = await fetch("/api/preferences");
  if (!res.ok) {
    throw new Error("Failed to fetch preferences");
  }
  return res.json();
}

async function savePreferences(preferences: Preferences): Promise<void> {
  const res = await fetch("/api/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) {
    throw new Error("Failed to save preferences");
  }
}

export function usePreferences() {
  return useQuery({
    queryKey: ["preferences"],
    queryFn: fetchPreferences,
    staleTime: Infinity,
  });
}

export function useTablePreferences(tableKey: "servicesTable" | "logsTable") {
  const queryClient = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: preferences } = usePreferences();
  const tablePrefs = preferences?.[tableKey];

  const mutation = useMutation({
    mutationFn: savePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
    },
  });

  const updatePreferences = useCallback(
    (updates: Partial<TablePreferences>) => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        const current = queryClient.getQueryData<Preferences>(["preferences"]) ?? {};
        const newPrefs: Preferences = {
          ...current,
          [tableKey]: {
            ...current[tableKey],
            ...updates,
          },
        };

        queryClient.setQueryData(["preferences"], newPrefs);
        mutation.mutate(newPrefs);
      }, 500);
    },
    [queryClient, tableKey, mutation]
  );

  return {
    preferences: tablePrefs,
    updatePreferences,
    isLoading: !preferences,
  };
}
