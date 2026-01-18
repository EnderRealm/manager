import { Routes, Route } from "react-router-dom";
import { Dashboard } from "./components/Dashboard.tsx";
import { KanbanBoard } from "./components/KanbanBoard.tsx";
import { TicketDetail } from "./components/TicketDetail.tsx";
import { TicketForm } from "./components/TicketForm.tsx";
import { Settings } from "./components/Settings.tsx";

export function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/projects/:id" element={<KanbanBoard />} />
        <Route path="/projects/:id/tickets/new" element={<TicketForm />} />
        <Route path="/projects/:id/tickets/:ticketId" element={<TicketDetail />} />
      </Routes>
    </div>
  );
}
