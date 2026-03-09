import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, X } from "lucide-react";

export function PWAUpdater() {
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    if (!isStandaloneMode) {
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

    // Register service worker manually
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(r => {
        console.log("SW Registered:", r);
      }).catch(() => {
        // SW not available, that's ok
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowInstallBanner(false);
      toast({ title: "App instalado com sucesso! 🎉" });
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
                Acesse mais rápido direto da tela inicial.
              </p>
            </div>
          </div>
          <button onClick={() => setShowInstallBanner(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {isIOS ? (
          <div className="text-xs bg-muted/50 p-2 rounded-lg border border-border/50">
            <p>Toque em <strong>compartilhar</strong> e depois em <strong>Adicionar à Tela Inicial</strong>.</p>
          </div>
        ) : (
          <Button onClick={handleInstallClick} className="w-full rounded-xl gap-2 h-10" disabled={!installPrompt}>
            <Download className="h-4 w-4" /> Instalar App
          </Button>
        )}
      </div>
    </div>
  );
}
