import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-small.webp";
import { LogOut, LogIn, UserPlus, User, Settings, Menu, Shield } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNavigation from "@/components/BottomNavigation";
import { ReactNode, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/login");
  };

  const handleMobileNav = (path: string) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header
        className="w-full"
        style={{
          background: "linear-gradient(135deg, hsl(224, 55%, 33%), hsl(224, 76%, 53%))",
        }}
      >
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 gap-2">
          <Link to="/" className="flex items-center gap-1 sm:gap-2 md:gap-3 min-w-0 flex-shrink-0">
            <img src={logo} alt="Motorista no Lucro" width={60} height={60} className="h-9 w-auto sm:h-12 md:h-16 object-contain flex-shrink-0" />
            <span className="text-xs sm:text-sm md:text-xl lg:text-2xl font-bold text-white truncate sm:whitespace-nowrap" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Motorista no Lucro
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
            {user ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                  <Home className="mr-1 h-4 w-4" />
                  Início
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/relatorios")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                  <BarChart3 className="mr-1 h-4 w-4" />
                  Relatórios
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/circuitos")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                  <Navigation className="mr-1 h-4 w-4" />
                  Circuitos
                </Button>
                <Link to="/perfil" className="flex items-center gap-2 group">
                  {profile?.photo_url ? (
                    <img src={profile.photo_url} alt={profile.name} className="h-9 w-9 rounded-full border-2 border-white/30 object-cover group-hover:border-white/60 transition" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white group-hover:bg-white/30 transition">
                      {(profile?.name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden md:inline text-sm text-white/80 group-hover:text-white transition">
                    {profile?.name || profile?.email}
                  </span>
                </Link>
                <Button variant="ghost" size="sm" onClick={() => navigate("/perfil")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                  <User className="mr-1 h-4 w-4" />
                  Perfil
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/configuracoes")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                  <Settings className="mr-1 h-4 w-4" />
                  Planejamento
                </Button>
                {isAdmin && (
                  <Button variant="ghost" size="sm" onClick={() => navigate("/admin")} className="hidden sm:inline-flex text-white/70 hover:bg-white/10 hover:text-white">
                    <Shield className="mr-1 h-4 w-4" />
                    Admin
                  </Button>
                )}
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={handleLogout} className="hidden sm:inline-flex border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                  <LogOut className="mr-1 h-4 w-4" />
                  Sair
                </Button>
                {/* Mobile hamburger menu */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="sm:hidden text-white hover:bg-white/10">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-64">
                    <SheetHeader>
                      <SheetTitle>Menu</SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col gap-2 mt-4">
                      <Button variant="ghost" className="justify-start py-6" onClick={() => handleMobileNav("/perfil")}>
                        <User className="mr-2 h-4 w-4" />
                        Perfil
                      </Button>
                      <Button variant="ghost" className="justify-start py-6" onClick={() => handleMobileNav("/configuracoes")}>
                        <Settings className="mr-2 h-4 w-4" />
                        Planejamento Financeiro
                      </Button>
                      <Button variant="ghost" className="justify-start py-6">
                        📱 Suporte
                      </Button>
                      <Button variant="ghost" className="justify-start py-6">
                        ⭐ Avaliar App
                      </Button>
                      <Button variant="ghost" className="justify-start py-6">
                        🔒 Política de Privacidade
                      </Button>
                      {isAdmin && (
                        <>
                          <div className="my-2 border-t border-border" />
                          <Button variant="ghost" className="justify-start py-6" onClick={() => handleMobileNav("/admin")}>
                            <Shield className="mr-2 h-4 w-4" />
                            Painel Admin
                          </Button>
                        </>
                      )}
                      <div className="my-2 border-t border-border" />
                      <Button variant="ghost" className="justify-start py-6 text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sair
                      </Button>
                    </nav>
                  </SheetContent>
                </Sheet>
              </>
            ) : (
              <>
                <ThemeToggle />
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-white hover:bg-white/10 hover:text-white">
                  <LogIn className="mr-1 h-4 w-4" />
                  Entrar
                </Button>
                <Button size="sm" onClick={() => navigate("/register")} className="bg-white text-primary hover:bg-white/90">
                  <UserPlus className="mr-1 h-4 w-4" />
                  Cadastrar
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>
      
      {user && <BottomNavigation />}
    </div>
  );
}
