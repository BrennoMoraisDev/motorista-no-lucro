import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { PWAUpdater } from "@/components/PWAUpdater";
import { Onboarding } from "@/components/Onboarding";
import AdminRoute from "@/components/AdminRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import FinalizarDia from "./pages/FinalizarDia";
import Relatorios from "./pages/Relatorios";
import Perfil from "./pages/Perfil";
import Configuracoes from "./pages/Configuracoes";
import Assinar from "./pages/Assinar";
import Manutencao from "./pages/Manutencao";
import Admin from "./pages/Admin";
import AdminUserPage from "./pages/AdminUserPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRecovering } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  
  // SECURITY: If we are in recovery mode, only allow the reset-password page
  const isRecoveryUrl = window.location.hash && (window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token="));
  if ((isRecovering || isRecoveryUrl) && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace />;
  }
  
  // If user is logged in (and not in recovery), redirect to dashboard
  if (user && !isRecovering && !isRecoveryUrl && location.pathname !== "/reset-password") {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="mnl-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdater />
        <Onboarding />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/finalizar-dia" element={<ProtectedRoute><FinalizarDia /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Relatorios /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />
              <Route path="/manutencao" element={<ProtectedRoute><Manutencao /></ProtectedRoute>} />
              <Route path="/assinar" element={<ProtectedRoute><Assinar /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin/users/:userId" element={<AdminRoute><AdminUserPage /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
