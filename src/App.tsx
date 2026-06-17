import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./features/auth/AuthContext.tsx";
import { SocketProvider } from "./features/socket/SocketContext.tsx";
import { ProtectedRoute } from "./features/auth/ProtectedRoute.tsx";
import { Layout } from "./components/Layout.tsx";
import { ErrorBoundary, ConnectionStatusBanner } from "./components/ProductionReadyUI.tsx";

// Lazy loading of modules for optimized code-splitting chunks
const LoginPage = lazy(() => import("./features/auth/LoginPage.tsx").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./features/auth/RegisterPage.tsx").then(m => ({ default: m.RegisterPage })));
const DashboardPage = lazy(() => import("./features/dashboard/DashboardPage.tsx").then(m => ({ default: m.DashboardPage })));
const TicketListPage = lazy(() => import("./features/tickets/TicketListPage.tsx").then(m => ({ default: m.TicketListPage })));
const TicketDetailPage = lazy(() => import("./features/tickets/TicketDetailPage.tsx").then(m => ({ default: m.TicketDetailPage })));
const CreateTicketPage = lazy(() => import("./features/tickets/CreateTicketPage.tsx").then(m => ({ default: m.CreateTicketPage })));
const WorkspaceSettingsPage = lazy(() => import("./features/workspaces/WorkspaceSettingsPage.tsx").then(m => ({ default: m.WorkspaceSettingsPage })));
const OnboardingPage = lazy(() => import("./features/workspaces/OnboardingPage.tsx").then(m => ({ default: m.OnboardingPage })));
const AuditLogPage = lazy(() => import("./features/audit/AuditLogPage.tsx").then(m => ({ default: m.AuditLogPage })));
const ProfilePage = lazy(() => import("./features/profile/ProfilePage.tsx").then(m => ({ default: m.ProfilePage })));
const BillingPage = lazy(() => import("./features/billing/BillingPage.tsx").then(m => ({ default: m.BillingPage })));
const InboxPage = lazy(() => import("./features/inbox/InboxPage.tsx").then(m => ({ default: m.InboxPage })));
const CustomersPage = lazy(() => import("./features/customers/CustomersPage.tsx").then(m => ({ default: m.CustomersPage })));
const SlaPage = lazy(() => import("./features/sla/SlaPage.tsx").then(m => ({ default: m.SlaPage })));
const KbPage = lazy(() => import("./features/kb/KbPage.tsx").then(m => ({ default: m.KbPage })));
const AutomationsPage = lazy(() => import("./features/automations/AutomationsPage.tsx").then(m => ({ default: m.AutomationsPage })));
const SecurityPage = lazy(() => import("./features/security/SecurityPage.tsx").then(m => ({ default: m.SecurityPage })));
const PerformanceHub = lazy(() => import("./features/performance/PerformanceHub.tsx").then(m => ({ default: m.PerformanceHub })));

import { Toaster } from "sonner";

function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-mono text-[10px] uppercase tracking-widest text-slate-500">
      <div className="flex flex-col items-center gap-4">
        <div className="h-4 w-4 animate-spin border-t-2 border-r-2 border-slate-900 rounded-full" />
        <span>Synchronizing operations terminal...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Toaster position="top-right" richColors />
          <ConnectionStatusBanner />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/workspaces/:workspaceId/inbox" element={<InboxPage />} />
                <Route path="/workspaces/:workspaceId/tickets" element={<TicketListPage />} />
                <Route path="/workspaces/:workspaceId/tickets/new" element={<CreateTicketPage />} />
                <Route path="/workspaces/:workspaceId/customers" element={<CustomersPage />} />
                <Route path="/workspaces/:workspaceId/sla" element={<SlaPage />} />
                <Route path="/workspaces/:workspaceId/kb" element={<KbPage />} />
                <Route path="/workspaces/:workspaceId/automations" element={<AutomationsPage />} />
                <Route path="/workspaces/onboarding" element={<OnboardingPage />} />
                <Route path="/workspaces/:workspaceId/tickets/:ticketId" element={<TicketDetailPage />} />
                <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
                <Route path="/workspaces/:workspaceId/billing" element={<BillingPage />} />
                <Route path="/workspaces/:workspaceId/audit" element={<AuditLogPage />} />
                <Route path="/workspaces/:workspaceId/security" element={<SecurityPage />} />
                <Route path="/workspaces/:workspaceId/performance" element={<PerformanceHub />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
