
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, BarChart3, Navigation, Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

export default function BottomNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await signOut();
    setMenuOpen(false);
    navigate("/login");
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl z-40">
      <div className="flex items-center justify-around px-2 py-3 max-w-2xl mx-auto">
        {/* Início */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard")}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all ${
            isActive("/dashboard")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs font-semibold">Início</span>
        </Button>

        {/* Relatórios */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/relatorios")}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all ${
            isActive("/relatorios")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="h-5 w-5" />
          <span className="text-xs font-semibold">Relatórios</span>
        </Button>

        {/* Circuitos */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/circuitos")}
          className={`flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl transition-all ${
            isActive("/circuitos")
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Navigation className="h-5 w-5" />
          <span className="text-xs font-semibold">Circuitos</span>
        </Button>

        {/* Menu */}
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs font-semibold">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="w-full rounded-t-3xl">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-2 mt-4">
              <Button
                variant="ghost"
                className="justify-start py-6 text-base font-semibold rounded-xl"
                onClick={() => handleNavigation("/perfil")}
              >
                👤 Perfil
              </Button>
              <Button
                variant="ghost"
                className="justify-start py-6 text-base font-semibold rounded-xl"
                onClick={() => handleNavigation("/configuracoes")}
              >
                💰 Planejamento Financeiro
              </Button>
              <Button
                variant="ghost"
                className="justify-start py-6 text-base font-semibold rounded-xl"
                onClick={() => handleNavigation("/manutencao")}
              >
                🔧 Manutenção
              </Button>
              {isAdmin && (
                <Button
                  variant="ghost"
                  className="justify-start py-6 text-base font-semibold rounded-xl text-blue-600 dark:text-blue-400"
                  onClick={() => handleNavigation("/admin")}
                >
                  🛡️ Painel Admin
                </Button>
              )}
              <div className="my-2 border-t border-border" />
              <Button
                variant="ghost"
                className="justify-start py-6 text-base font-semibold rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                🚪 Sair
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
