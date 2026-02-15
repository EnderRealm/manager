import { Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { Dashboard } from "./components/Dashboard.tsx";
import { ProjectView } from "./components/ProjectView.tsx";
import { TicketDetail } from "./components/TicketDetail.tsx";
import { TicketForm } from "./components/TicketForm.tsx";
import { Settings } from "./components/Settings.tsx";
import { InsightsPage } from "./components/InsightsPage.tsx";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/projects/:id" element={<ProjectView />} />
        <Route path="/projects/:id/tickets/new" element={<TicketForm />} />
        <Route path="/projects/:id/tickets/:ticketId" element={<TicketDetail />} />
      </Route>
    </Routes>
  );
}
