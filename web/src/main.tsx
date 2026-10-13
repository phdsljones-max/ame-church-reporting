import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth, canAccess } from "./auth/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MonthlyReport from "./pages/MonthlyReport";
import QuarterlyReport from "./pages/QuarterlyReport";
import AnnualReport from "./pages/AnnualReport";
import AnnualSetup from "./pages/AnnualSetup";
import Components from "./pages/Components";
import WrittenReports from "./pages/WrittenReports";
import Composite from "./pages/Composite";
import Calendar from "./pages/Calendar";
import Guide from "./pages/Guide";
import AdminUsers from "./pages/AdminUsers";
import AdminDistricts from "./pages/AdminDistricts";
import { registerServiceWorker } from "./pwa/register";
import "./index.css";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="content"><p>Loading…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireGate({ gate, message, children }: { gate: string; message: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="content"><p>Loading…</p></main>;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, gate))
    return <main className="content"><div className="error">{message}</div></main>;
  return <>{children}</>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="/churches/:id/monthly" element={<MonthlyReport />} />
            <Route path="/churches/:id/quarterly" element={<QuarterlyReport />} />
            <Route path="/churches/:id/annual" element={<AnnualReport />} />
            <Route path="/churches/:id/annual-setup" element={<AnnualSetup />} />
            <Route path="/components" element={<Components />} />
            <Route path="/written-reports" element={<WrittenReports />} />
            <Route path="/composite" element={<Composite />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/guide" element={<Guide />} />
            <Route
              path="/admin/users"
              element={
                <RequireGate gate="admin_users" message="Only the platform owner and district admins can manage users.">
                  <AdminUsers />
                </RequireGate>
              }
            />
            <Route
              path="/admin/districts"
              element={
                <RequireGate gate="admin_districts" message="Only the platform owner can view this page.">
                  <AdminDistricts />
                </RequireGate>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);

registerServiceWorker();
