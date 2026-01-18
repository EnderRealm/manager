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
  });
}

export function useReadyTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "ready"],
    queryFn: () => fetchTickets(projectId, "ready"),
  });
}

export function useBlockedTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "blocked"],
    queryFn: () => fetchTickets(projectId, "blocked"),
  });
}

export function useClosedTickets(projectId: string) {
  return useQuery({
    queryKey: ["tickets", projectId, "closed"],
    queryFn: () => fetchTickets(projectId, "closed"),
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
  });
}

export interface CreateTicketInput {
  title: string;
  type?: string;
  priority?: number;
  description?: string;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
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

export function useTicketMutations(projectId: string) {
  const queryClient = useQueryClient();

  const invalidateTickets = () => {
    queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
  };

  const startMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "start"),
    onSuccess: invalidateTickets,
  });

  const closeMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "close"),
    onSuccess: invalidateTickets,
  });

  const reopenMutation = useMutation({
    mutationFn: (ticketId: string) =>
      updateTicketStatus(projectId, ticketId, "reopen"),
    onSuccess: invalidateTickets,
  });

  return {
    start: startMutation.mutate,
    close: closeMutation.mutate,
    reopen: reopenMutation.mutate,
    isLoading:
      startMutation.isPending ||
      closeMutation.isPending ||
      reopenMutation.isPending,
  };
}
