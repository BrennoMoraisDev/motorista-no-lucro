
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, Navigation } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-40">
      <div className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto w-full">
        {/* Início */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 h-auto py-3 px-4 rounded-xl transition-colors duration-200 ${
            isActive("/dashboard")
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs font-semibold">Início</span>
        </Button>

        {/* Relatórios */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/relatorios")}
          className={`flex flex-col items-center gap-1 h-auto py-3 px-4 rounded-xl transition-colors duration-200 ${
            isActive("/relatorios")
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="h-6 w-6" />
          <span className="text-xs font-semibold">Relatórios</span>
        </Button>

        {/* Circuitos */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/circuitos")}
          className={`flex flex-col items-center gap-1 h-auto py-3 px-4 rounded-xl transition-colors duration-200 ${
            isActive("/circuitos")
              ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Navigation className="h-6 w-6" />
          <span className="text-xs font-semibold">Circuitos</span>
        </Button>
      </div>
    </div>
  );
}
