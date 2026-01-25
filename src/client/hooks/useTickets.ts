import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Ticket {
  id: string;
  status: string;
  deps: string[];
  links: string[];
  created: string;
  type: string;
  priority: number;
  assignee?: string;
  parent?: string;
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  children?: string[];
  rawContent?: string;
}

async function fetchTickets(
  projectId: string,
  category: "all" | "ready" | "blocked" | "closed"
): Promise<Ticket[]> {
  const path =
    category === "all"
      ? `/api/projects/${projectId}/tickets`
      : `/api/projects/${projectId}/tickets/${category}`;

  const res = await fetch(path);
  if (!res.ok) {
    throw new Error("Failed to fetch tickets");
  }
  return res.json();
}

export function useAllTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "all"],
    queryFn: () => fetchTickets(projectId, "all"),
    refetchOnWindowFocus: true,
  });
}

export function useReadyTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "ready"],
    queryFn: () => fetchTickets(projectId, "ready"),
    refetchOnWindowFocus: true,
  });
}

export function useBlockedTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "blocked"],
    queryFn: () => fetchTickets(projectId, "blocked"),
    refetchOnWindowFocus: true,
  });
}

export function useClosedTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "closed"],
    queryFn: () => fetchTickets(projectId, "closed"),
    refetchOnWindowFocus: true,
  });
}

async function fetchTicket(
  projectId: string,
  ticketId: string
): Promise<Ticket> {
  const res = await fetch(`/api/projects/${projectId}/tickets/${ticketId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch ticket");
  }
  return res.json();
}

export function useTicket(projectId: string, ticketId: string) {
  return useQuery({
    queryKey: ["ticket", projectId, ticketId],
    queryFn: () => fetchTicket(projectId, ticketId),
    refetchOnWindowFocus: true,
  });
}

export interface CreateTicketInput {
  title: string;
  type?: string;
  priority?: number;
  description?: string;
  parent?: string;
}

export interface UpdateTicketInput {
  title?: string;
  description?: string;
  design?: string;
  acceptanceCriteria?: string;
  status?: string;
  type?: string;
  priority?: number;
  assignee?: string;
  parent?: string;
}

async function createTicket(
  projectId: string,
  input: CreateTicketInput
): Promise<Ticket> {
  const res = await fetch(`/api/projects/${projectId}/tickets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error("Failed to create ticket");
  }
  return res.json();
}

export function useCreateTicket(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(projectId, input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // If a parent was specified, invalidate the parent ticket's query
      // so its children list updates
      if (variables.parent) {
        queryClient.invalidateQueries({
          queryKey: ["ticket", projectId, variables.parent],
        });
      }
    },
  });
}

async function updateTicketStatus(
  projectId: string,
  ticketId: string,
  action: "start" | "close" | "reopen"
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/${action}`,
    { method: "POST" }
  );
  if (!res.ok) {
    throw new Error(`Failed to ${action} ticket`);
  }
  return res.json();
}

async function addDependency(
  projectId: string,
  ticketId: string,
  blockerId: string
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/deps`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockerId }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to add dependency");
  }
  return res.json();
}

async function removeDependency(
  projectId: string,
  ticketId: string,
  blockerId: string
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/deps/${blockerId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new Error("Failed to remove dependency");
  }
  return res.json();
}

async function setParentApi(
  projectId: string,
  ticketId: string,
  parentId: string
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/parent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to set parent");
  }
  return res.json();
}

async function clearParentApi(
  projectId: string,
  ticketId: string
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}/parent`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new Error("Failed to clear parent");
  }
  return res.json();
}

async function updatePriorityApi(
  projectId: string,
  ticketId: string,
  priority: number
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to update priority");
  }
  return res.json();
}

async function deleteTicketApi(
  projectId: string,
  ticketId: string
): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    throw new Error("Failed to delete ticket");
  }
}

async function updateTicketApi(
  projectId: string,
  ticketId: string,
  input: UpdateTicketInput
): Promise<Ticket> {
  const res = await fetch(
    `/api/projects/${projectId}/tickets/${ticketId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) {
    throw new Error("Failed to update ticket");
  }
  return res.json();
}

export function useTicketMutations(projectId: string) {
  const queryClient = useQueryClient();

  const invalidateTickets = (ticketId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    if (ticketId) {
      queryClient.invalidateQueries({
        queryKey: ["ticket", projectId, ticketId],
      });
    }
  };

  const startMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "start"),
    onSuccess: (_data, ticketId) => invalidateTickets(ticketId),
  });

  const closeMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "close"),
    onSuccess: (_data, ticketId) => invalidateTickets(ticketId),
  });

  const reopenMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "reopen"),
    onSuccess: (_data, ticketId) => invalidateTickets(ticketId),
  });

  const addDepMutation = useMutation({
    mutationFn: ({ ticketId, blockerId }: { ticketId: string; blockerId: string }) =>
      addDependency(projectId, ticketId, blockerId),
    onSuccess: (_data, { ticketId, blockerId }) => {
      invalidateTickets(ticketId);
      invalidateTickets(blockerId);
    },
  });

  const removeDepMutation = useMutation({
    mutationFn: ({ ticketId, blockerId }: { ticketId: string; blockerId: string }) =>
      removeDependency(projectId, ticketId, blockerId),
    onSuccess: (_data, { ticketId, blockerId }) => {
      invalidateTickets(ticketId);
      invalidateTickets(blockerId);
    },
  });

  const setParentMutation = useMutation({
    mutationFn: ({ ticketId, parentId }: { ticketId: string; parentId: string }) =>
      setParentApi(projectId, ticketId, parentId),
    onSuccess: (_data, { ticketId, parentId }) => {
      invalidateTickets(ticketId);
      invalidateTickets(parentId);
    },
  });

  const clearParentMutation = useMutation({
    mutationFn: ({ ticketId, parentId }: { ticketId: string; parentId: string }) =>
      clearParentApi(projectId, ticketId),
    onSuccess: (_data, { ticketId, parentId }) => {
      invalidateTickets(ticketId);
      invalidateTickets(parentId);
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ ticketId, priority }: { ticketId: string; priority: number }) =>
      updatePriorityApi(projectId, ticketId, priority),
    onSuccess: (_data, { ticketId }) => invalidateTickets(ticketId),
  });

  const deleteMutation = useMutation({
    mutationFn: (ticketId: string) =>
      deleteTicketApi(projectId, ticketId),
    onSuccess: () => invalidateTickets(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, input }: { ticketId: string; input: UpdateTicketInput }) =>
      updateTicketApi(projectId, ticketId, input),
    onSuccess: (_data, { ticketId }) => invalidateTickets(ticketId),
  });

  // Track which tickets are currently being mutated
  const pendingTicketIds = new Set<string>();
  if (startMutation.isPending && startMutation.variables) {
    pendingTicketIds.add(startMutation.variables);
  }
  if (closeMutation.isPending && closeMutation.variables) {
    pendingTicketIds.add(closeMutation.variables);
  }
  if (reopenMutation.isPending && reopenMutation.variables) {
    pendingTicketIds.add(reopenMutation.variables);
  }

  return {
    start: startMutation.mutate,
    close: closeMutation.mutate,
    reopen: reopenMutation.mutate,
    addDep: addDepMutation.mutate,
    removeDep: removeDepMutation.mutate,
    setParent: setParentMutation.mutate,
    clearParent: clearParentMutation.mutate,
    updatePriority: updatePriorityMutation.mutate,
    deleteTicket: deleteMutation.mutate,
    updateTicket: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    isLoading:
      startMutation.isPending ||
      closeMutation.isPending ||
      reopenMutation.isPending ||
      addDepMutation.isPending ||
      removeDepMutation.isPending ||
      setParentMutation.isPending ||
      clearParentMutation.isPending ||
      updatePriorityMutation.isPending ||
      deleteMutation.isPending ||
      updateMutation.isPending,
    pendingTicketIds,
  };
}
