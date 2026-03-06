
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, SkipForward, Pause, RefreshCw, AlertTriangle, Clock } from "lucide-react";
import Layout from "@/components/Layout";
import { circuitos, Circuito, Ponto } from "@/lib/circuitos-data";

export default function Circuitos() {
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [closestCircuito, setClosestCircuito] = useState<Circuito | null>(null);
  const [isCircuitActive, setIsCircuitActive] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [timeWithoutRide, setTimeWithoutRide] = useState(0); // em segundos
  const [isPaused, setIsPaused] = useState(false);
  const [distanceToPoint, setDistanceToPoint] = useState<number | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Cálculo de distância Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const findClosestCircuit = useCallback((coords: GeolocationCoordinates) => {
    let minDistance = Infinity;
    let closest = null;

    circuitos.forEach((circuito) => {
      const dist = calculateDistance(
        coords.latitude,
        coords.longitude,
        circuito.centro.lat,
        circuito.centro.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        closest = circuito;
      }
    });

    setClosestCircuito(closest);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation(position.coords);
          if (!isCircuitActive) {
            findClosestCircuit(position.coords);
          } else if (closestCircuito) {
            const currentPoint = closestCircuito.pontos[currentPointIndex];
            const dist = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              currentPoint.lat,
              currentPoint.lng
            );
            setDistanceToPoint(dist);

            // Detecção de chegada (80 metros)
            if (dist < 80) {
              toast({
                title: "Você chegou ao ponto!",
                description: "Clique em 'Próximo Ponto' para continuar.",
              });
            }
          }
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          toast({
            title: "Erro de Localização",
            description: "Não foi possível obter sua localização GPS.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isCircuitActive, closestCircuito, currentPointIndex, findClosestCircuit, toast]);

  // Timer de tempo sem corrida
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCircuitActive && !isPaused) {
      interval = setInterval(() => {
        setTimeWithoutRide((prev) => {
          const newValue = prev + 1;
          // Alerta de baixa demanda (15 minutos = 900 segundos)
          if (newValue === 900) {
            toast({
              title: "Baixa Demanda Detectada",
              description: "Você está há 15 minutos sem corridas. Sugerimos mudar de circuito.",
              variant: "destructive",
            });
          }
          return newValue;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCircuitActive, isPaused, toast]);

  const handleStartCircuit = () => {
    if (closestCircuito) {
      setIsCircuitActive(true);
      setCurrentPointIndex(0);
      setTimeWithoutRide(0);
      setIsPaused(false);
      toast({
        title: "Circuito Iniciado",
        description: `Iniciando circuito: ${closestCircuito.nome}`,
      });
    }
  };

  const handleNextPoint = () => {
    if (closestCircuito) {
      if (currentPointIndex < closestCircuito.pontos.length - 1) {
        setCurrentPointIndex(currentPointIndex + 1);
      } else {
        setCurrentPointIndex(0); // Reinicia o circuito
        toast({
          title: "Circuito Reiniciado",
          description: "Você completou todos os pontos. Voltando ao início.",
        });
      }
    }
  };

  const handleOpenWaze = () => {
    if (closestCircuito) {
      const point = closestCircuito.pontos[currentPointIndex];
      window.open(`https://waze.com/ul?ll=${point.lat},${point.lng}&navigate=yes`, "_blank");
    }
  };

  const handleRecalculate = () => {
    if (userLocation) {
      findClosestCircuit(userLocation);
      setIsCircuitActive(false);
      toast({
        title: "Recalculando",
        description: "Buscando circuito mais próximo da sua nova posição.",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 pb-24">
        <div className="mb-6 flex items-center gap-2">
          <Navigation className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Circuitos Inteligentes</h1>
        </div>

        {!isCircuitActive ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Circuito mais próximo encontrado</CardTitle>
              <CardDescription>
                Baseado na sua localização atual em São Paulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {closestCircuito ? (
                <div className="flex items-center justify-between rounded-xl bg-background p-4 shadow-sm">
                  <div>
                    <p className="text-lg font-bold text-primary">{closestCircuito.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {closestCircuito.pontos.length} pontos estratégicos
                    </p>
                  </div>
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
              ) : (
                <div className="flex animate-pulse items-center justify-center p-8">
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Buscando localização...
                </div>
              )}

              <Button 
                className="w-full py-6 text-lg font-bold" 
                disabled={!closestCircuito}
                onClick={handleStartCircuit}
              >
                INICIAR CIRCUITO
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-primary shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{closestCircuito?.nome}</CardTitle>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    PONTO {currentPointIndex + 1}/{closestCircuito?.pontos.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground uppercase font-semibold tracking-wider">Ponto atual</p>
                  <p className="text-2xl font-bold">{closestCircuito?.pontos[currentPointIndex].nome}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-xs text-muted-foreground mb-1">Distância</p>
                    <p className="text-xl font-bold">
                      {distanceToPoint !== null 
                        ? distanceToPoint > 1000 
                          ? `${(distanceToPoint / 1000).toFixed(1)} km` 
                          : `${Math.round(distanceToPoint)} m`
                        : "---"}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-4 ${timeWithoutRide >= 900 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                    <p className="text-xs text-muted-foreground mb-1">Sem corrida</p>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <p className="text-xl font-bold">{formatTime(timeWithoutRide)}</p>
                    </div>
                  </div>
                </div>

                {timeWithoutRide >= 900 && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-destructive border border-destructive/20">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-bold">BAIXA DEMANDA DETECTADA</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <Button variant="default" className="w-full py-6 text-lg font-bold bg-[#00E676] hover:bg-[#00C853] text-black" onClick={handleOpenWaze}>
                    ABRIR NO WAZE
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="py-6 font-bold" onClick={handleNextPoint}>
                      <SkipForward className="mr-2 h-4 w-4" />
                      PRÓXIMO PONTO
                    </Button>
                    <Button 
                      variant={isPaused ? "default" : "secondary"} 
                      className="py-6 font-bold"
                      onClick={() => setIsPaused(!isPaused)}
                    >
                      {isPaused ? <Navigation className="mr-2 h-4 w-4" /> : <Pause className="mr-2 h-4 w-4" />}
                      {isPaused ? "RETOMAR" : "CORRIDA TOCOU"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-primary"
              onClick={handleRecalculate}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              CAÍ EM OUTRA REGIÃO (RECALCULAR)
            </Button>
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-muted/50 p-4 border border-border">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Dica de Especialista
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Estes circuitos foram desenhados para manter você em movimento em áreas de alta demanda (hospitais, metrôs e shoppings). Se em 15 minutos não tocar nada, o sistema sugerirá uma nova região.
          </p>
        </div>
      </div>
    </Layout>
  );
}
