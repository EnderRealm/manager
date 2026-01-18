export interface Project {
  name: string;
  path: string;
}

export interface Ticket {
  id: string;
  status: string;
  type: string;
  priority: number;
  title: string;
  deps: string[];
  parent?: string;
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || res.statusText);
  }
  return res.json();
}

export function getProjects(): Promise<Project[]> {
  return fetchJson("/api/projects");
}

export function getProject(name: string): Promise<Project> {
  return fetchJson(`/api/projects/${encodeURIComponent(name)}`);
}

export function getTickets(projectName: string): Promise<Ticket[]> {
  return fetchJson(`/api/projects/${encodeURIComponent(projectName)}/tickets`);
}

export function getTicket(projectName: string, ticketId: string): Promise<Ticket> {
  return fetchJson(
    `/api/projects/${encodeURIComponent(projectName)}/tickets/${encodeURIComponent(ticketId)}`
  );
}

export interface CreateTicketInput {
  title: string;
  type?: string;
  priority?: number;
  description?: string;
  parent?: string;
}

export function createTicket(
  projectName: string,
  input: CreateTicketInput
): Promise<Ticket> {
  return fetchJson(`/api/projects/${encodeURIComponent(projectName)}/tickets`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateTicketStatus(
  projectName: string,
  ticketId: string,
  status: string
): Promise<Ticket> {
  return fetchJson(
    `/api/projects/${encodeURIComponent(projectName)}/tickets/${encodeURIComponent(ticketId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}
