import { useEffect, useState, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, X } from "lucide-react";

export function PWAUpdater() {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered:", r);
      
      // AUTOMATIC UPDATE CHECK: Check for updates every 60 seconds for installed apps
      if (isStandalone) {
        updateCheckIntervalRef.current = setInterval(() => {
          if (r) {
            r.update().catch(err => console.log("Update check error:", err));
          }
        }, 60000); // Check every 60 seconds
      }
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  // AUTOMATIC RELOAD: When update is detected, automatically reload after 5 seconds
  useEffect(() => {
    if (needRefresh && isStandalone) {
      // For installed apps, show a notification and auto-reload
      toast({
        title: "✨ Atualização disponível",
        description: "Recarregando a versão mais recente...",
        duration: 5000,
      });

      // Auto-reload after 5 seconds for seamless update
      const reloadTimer = setTimeout(() => {
        updateServiceWorker(true);
        window.location.reload();
      }, 5000);

      return () => clearTimeout(reloadTimer);
    } else if (needRefresh && !isStandalone) {
      // For web users, show a button to update manually
      toast({
        title: "Nova versão disponível",
        description: "Clique em atualizar para carregar as melhorias.",
        action: (
          <Button 
            size="sm" 
            onClick={() => {
              updateServiceWorker(true);
              window.location.reload();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        ),
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker, toast, isStandalone]);

  useEffect(() => {
    // Check if it's iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Check if app is already installed (standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    if (!isStandaloneMode) {
      // Check session/time rules: Show install banner for web users
      const firstSessionTime = localStorage.getItem("mnl_first_session");
      const now = Date.now();
      
      if (!firstSessionTime) {
        localStorage.setItem("mnl_first_session", now.toString());
        setShowInstallBanner(true);
      } else {
        const twoHours = 2 * 60 * 60 * 1000;
        if (now - parseInt(firstSessionTime) < twoHours) {
          setShowInstallBanner(true);
        }
      }
    }

    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      // Cleanup update interval
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
      }
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      // Show success message
      toast({
        title: "App instalado com sucesso! 🎉",
        description: "Agora você receberá atualizações automaticamente.",
      });
    }
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-card border border-border rounded-2xl p-4 shadow-2xl flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex gap-3 items-center">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Instale o aplicativo</h3>
              <p className="text-xs text-muted-foreground">
                Acesse mais rápido e receba atualizações automáticas.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowInstallBanner(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="text-xs bg-muted/50 p-2 rounded-lg border border-border/50">
            <p className="flex items-center gap-1">
              Toque no botão <strong>compartilhar</strong> e depois em <strong>Adicionar à Tela Inicial</strong>.
            </p>
          </div>
        ) : (
          <Button 
            onClick={handleInstallClick} 
            className="w-full rounded-xl gap-2 h-10"
            disabled={!installPrompt}
          >
            <Download className="h-4 w-4" />
            Instalar App
          </Button>
        )}
      </div>
    </div>
  );
}
