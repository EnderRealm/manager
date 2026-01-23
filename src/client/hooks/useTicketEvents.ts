import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface TicketChangeEvent {
  projectId: string;
  type: "change" | "add" | "remove";
  ticketId?: string;
  timestamp: number;
}

interface ServiceStatusEvent {
  projectId: string;
  serviceId: string;
  status: string;
  error?: string;
}

export function useTicketEvents(projectId: string | undefined) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) return;

    const eventSource = new EventSource(`/api/projects/${projectId}/events`);
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("connected", (e) => {
      console.log("[SSE] Connected to ticket events", JSON.parse(e.data));
    });

    eventSource.addEventListener("ticket-change", (e) => {
      const event: TicketChangeEvent = JSON.parse(e.data);
      console.log("[SSE] Ticket change:", event);

      // Invalidate all ticket queries for this project
      queryClient.invalidateQueries({ queryKey: ["tickets", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });

      // If a specific ticket changed, also invalidate its individual query
      if (event.ticketId) {
        queryClient.invalidateQueries({
          queryKey: ["ticket", projectId, event.ticketId],
        });
      }
    });

    eventSource.addEventListener("service-status", (e) => {
      const event: ServiceStatusEvent = JSON.parse(e.data);
      console.log("[SSE] Service status change:", event);

      // Invalidate services query for this project
      queryClient.invalidateQueries({ queryKey: ["services", projectId] });
    });

    eventSource.addEventListener("ping", () => {
      // Keep-alive ping, no action needed
    });

    eventSource.onerror = (err) => {
      console.error("[SSE] EventSource error:", err);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [projectId, queryClient]);
}
