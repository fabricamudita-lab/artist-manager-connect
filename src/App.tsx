import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedRoute, ForbiddenPage } from "@/components/ProtectedRoute";
import { DevRoleSwitcher } from "@/components/DevRoleSwitcher";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Calendar from "./pages/Calendar";
import Budgets from "./pages/Budgets";
import Booking from "./pages/Booking";
import Documents from "./pages/Documents";
import Chat from "./pages/Chat";
import Solicitudes from "./pages/Solicitudes";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Approvals from "./pages/Approvals";
import ApprovalDetail from "./pages/ApprovalDetail";
import EPKBuilder from "./pages/EPKBuilder";
import { PublicEPKPage } from "./pages/PublicEPK";
import { EPKPasswordProtectionPage } from "./pages/EPKPasswordProtection";

const queryClient = new QueryClient();

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <HelmetProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DevRoleSwitcher />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={
                <PublicRoute>
                  <Index />
                </PublicRoute>
              } />
              <Route path="/auth" element={
                <PublicRoute>
                  <Auth />
                </PublicRoute>
              } />
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Dashboard />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/calendar" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Calendar />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/budgets" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Budgets />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/booking" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Booking />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/documents" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Documents />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Chat />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/solicitudes" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Solicitudes />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <Projects />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/projects/:id" element={
                <ProtectedRoute projectId={window.location.pathname.split('/')[2]}>
                  <DashboardLayout>
                    <ProjectDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/projects/:id/approvals" element={
                <ProtectedRoute projectId={window.location.pathname.split('/')[2]}>
                  <DashboardLayout>
                    <Approvals />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/approvals/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <ApprovalDetail />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/epk-builder" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EPKBuilder />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              <Route path="/epk-builder/:id" element={
                <ProtectedRoute>
                  <DashboardLayout>
                    <EPKBuilder />
                  </DashboardLayout>
                </ProtectedRoute>
              } />
              {/* Public EPK Routes */}
              <Route path="/epk/:slug" element={<PublicEPKPage />} />
              <Route path="/epk/:slug/password" element={<EPKPasswordProtectionPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </HelmetProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
