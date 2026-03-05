import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const FREE_ROUTES = ["/assinar", "/perfil", "/configuracoes"];

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, hasAccess, isReadOnly, isRecovering } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // SECURITY: If we are in recovery mode, block access to protected routes
  // and redirect to reset-password page
  if (isRecovering || (window.location.hash && window.location.hash.includes("type=recovery"))) {
    return <Navigate to="/reset-password" replace />;
  }

  if (!user) return <Navigate to="/login" replace />;

  // Allow free routes regardless of subscription
  if (FREE_ROUTES.some((r) => location.pathname.startsWith(r))) {
    return <>{children}</>;
  }

  // Read-only users can access dashboard and relatorios (view-only)
  if (isReadOnly) {
    const readOnlyRoutes = ["/dashboard", "/relatorios"];
    if (readOnlyRoutes.some((r) => location.pathname.startsWith(r))) {
      return <>{children}</>;
    }
    // Redirect expired users to dashboard instead of /assinar
    return <Navigate to="/dashboard" replace />;
  }

  // Blocked accounts (no read-only, no access) → /assinar
  if (!hasAccess) {
    return <Navigate to="/assinar" replace />;
  }

  return <>{children}</>;
}
