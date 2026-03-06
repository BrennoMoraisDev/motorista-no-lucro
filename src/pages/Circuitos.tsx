
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Navigation, SkipForward, Pause, RefreshCw, AlertTriangle, Clock, Zap, ChevronRight } from "lucide-react";
import Layout from "@/components/Layout";
import { circuitos, Circuito, Ponto } from "@/lib/circuitos-data";

export default function Circuitos() {
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [closestCircuito, setClosestCircuito] = useState<Circuito | null>(null);
  const [isCircuitActive, setIsCircuitActive] = useState(false);
  const [currentPointIndex, setCurrentPointIndex] = useState(0);
  const [timeWithoutRide, setTimeWithoutRide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceToPoint, setDistanceToPoint] = useState<number | null>(null);
  const [huntModeActive, setHuntModeActive] = useState(false);
  const [showCircuitList, setShowCircuitList] = useState(false);
  const [circuitCompleted, setCircuitCompleted] = useState(false);
  const [arrivedAtPoint, setArrivedAtPoint] = useState(false);
  const [nearbyCircuits, setNearbyCircuits] = useState<Array<{ circuito: Circuito; distance: number }>>([]);
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
    const distances = circuitos.map((circuito) => ({
      circuito,
      distance: calculateDistance(
        coords.latitude,
        coords.longitude,
        circuito.centro.lat,
        circuito.centro.lng
      ),
    }));

    distances.sort((a, b) => a.distance - b.distance);
    setClosestCircuito(distances[0].circuito);
    setNearbyCircuits(distances.slice(0, 4));
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
            if (dist < 80 && !arrivedAtPoint) {
              setArrivedAtPoint(true);
              toast({
                title: "Você chegou ao ponto!",
                description: "Clique em 'Cheguei no Ponto' para avançar.",
              });
            } else if (dist >= 80) {
              setArrivedAtPoint(false);
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
  }, [isCircuitActive, closestCircuito, currentPointIndex, findClosestCircuit, toast, arrivedAtPoint]);

  // Timer de tempo sem corrida
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCircuitActive && !isPaused) {
      interval = setInterval(() => {
        setTimeWithoutRide((prev) => {
          const newValue = prev + 1;
          
          // Modo Caça: trocar circuito automaticamente após 12 minutos
          if (huntModeActive && newValue === 720 && userLocation) {
            toast({
              title: "Modo Caça Ativo",
              description: "Buscando novo circuito com melhor demanda...",
            });
            findClosestCircuit(userLocation);
            setCurrentPointIndex(0);
            setTimeWithoutRide(0);
          }
          
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
  }, [isCircuitActive, isPaused, huntModeActive, userLocation, findClosestCircuit, toast]);

  const handleStartCircuit = (circuito?: Circuito) => {
    const circuit = circuito || closestCircuito;
    if (circuit) {
      setClosestCircuito(circuit);
      setIsCircuitActive(true);
      setCurrentPointIndex(0);
      setTimeWithoutRide(0);
      setIsPaused(false);
      setCircuitCompleted(false);
      setShowCircuitList(false);
      toast({
        title: "Circuito Iniciado",
        description: `Iniciando circuito: ${circuit.nome}`,
      });
    }
  };

  const handleNextPoint = () => {
    if (closestCircuito) {
      if (currentPointIndex < closestCircuito.pontos.length - 1) {
        setCurrentPointIndex(currentPointIndex + 1);
        setArrivedAtPoint(false);
        setTimeWithoutRide(0);
      } else {
        setCircuitCompleted(true);
        setIsCircuitActive(false);
        toast({
          title: "Circuito Finalizado",
          description: "Você completou todos os pontos do circuito.",
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
      setCircuitCompleted(false);
      toast({
        title: "Recalculando",
        description: "Buscando circuito mais próximo da sua nova posição.",
      });
    }
  };

  const handlePauseForRide = () => {
    setIsPaused(true);
    toast({
      title: "Circuito Pausado",
      description: "Boa sorte na corrida! Clique em 'Retomar' quando terminar.",
    });
  };

  const handleResume = () => {
    setIsPaused(false);
    setTimeWithoutRide(0);
    toast({
      title: "Circuito Retomado",
      description: "Voltando a rodar no circuito.",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDistance = (meters: number) => {
    if (meters > 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  return (
    <Layout>
      <div className="container mx-auto p-4 pb-24">
        <div className="mb-6 flex items-center gap-2">
          <Navigation className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Circuitos Inteligentes</h1>
        </div>

        {!isCircuitActive && !circuitCompleted && (
          <Card className="border-primary/20 bg-primary/5 shadow-md">
            <CardHeader>
              <CardTitle>Circuito mais próximo encontrado</CardTitle>
              <CardDescription>
                Baseado na sua localização atual em São Paulo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {closestCircuito ? (
                <div className="flex items-center justify-between rounded-2xl bg-background p-4 shadow-sm border border-border">
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
                className="w-full py-6 text-lg font-bold rounded-2xl" 
                disabled={!closestCircuito}
                onClick={() => handleStartCircuit()}
              >
                INICIAR CIRCUITO
              </Button>
            </CardContent>
          </Card>
        )}

        {isCircuitActive && (
          <div className="space-y-4">
            {/* Cartão Principal do Circuito */}
            <Card className="border-primary shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-r from-primary/10 to-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Circuito Ativo</p>
                    <p className="text-2xl font-bold text-primary">{closestCircuito?.nome}</p>
                  </div>
                  <span className="rounded-full bg-primary text-white px-4 py-2 text-sm font-bold">
                    {currentPointIndex + 1}/{closestCircuito?.pontos.length}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                {/* Nome do Ponto Atual */}
                <div className="border-l-4 border-primary pl-4">
                  <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wider mb-1">Ponto Atual</p>
                  <p className="text-2xl font-bold">{closestCircuito?.pontos[currentPointIndex].nome}</p>
                </div>

                {/* Indicadores Principais */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-600 dark:text-blue-300 font-semibold mb-2 uppercase tracking-wider">Distância</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-200">
                      {distanceToPoint !== null ? formatDistance(distanceToPoint) : "---"}
                    </p>
                  </div>
                  <div className={`rounded-2xl p-4 border transition-all ${
                    timeWithoutRide >= 900 
                      ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800' 
                      : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800'
                  }`}>
                    <p className={`text-xs font-semibold mb-2 uppercase tracking-wider ${
                      timeWithoutRide >= 900 
                        ? 'text-red-600 dark:text-red-300' 
                        : 'text-green-600 dark:text-green-300'
                    }`}>Sem Corrida</p>
                    <div className="flex items-center gap-2">
                      <Clock className={`h-5 w-5 ${
                        timeWithoutRide >= 900 
                          ? 'text-red-700 dark:text-red-200' 
                          : 'text-green-700 dark:text-green-200'
                      }`} />
                      <p className={`text-2xl font-bold ${
                        timeWithoutRide >= 900 
                          ? 'text-red-700 dark:text-red-200' 
                          : 'text-green-700 dark:text-green-200'
                      }`}>{formatTime(timeWithoutRide)}</p>
                    </div>
                  </div>
                </div>

                {/* Alerta de Baixa Demanda */}
                {timeWithoutRide >= 900 && (
                  <div className="flex items-center gap-3 rounded-2xl bg-red-50 dark:bg-red-950 p-4 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0" />
                    <div>
                      <p className="font-bold text-red-700 dark:text-red-200">BAIXA DEMANDA DETECTADA</p>
                      <p className="text-sm text-red-600 dark:text-red-300">Considere trocar de circuito</p>
                    </div>
                  </div>
                )}

                {/* Modo Caça Ativo */}
                {huntModeActive && (
                  <div className="flex items-center gap-3 rounded-2xl bg-yellow-50 dark:bg-yellow-950 p-4 border border-yellow-200 dark:border-yellow-800">
                    <Zap className="h-6 w-6 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <div>
                      <p className="font-bold text-yellow-700 dark:text-yellow-200">MODO CAÇA ATIVO</p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300">Procurando novas regiões de demanda</p>
                    </div>
                  </div>
                )}

                {/* Botão Principal - Waze */}
                <Button 
                  className="w-full py-7 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all" 
                  style={{ backgroundColor: "#16C75E" }}
                  onClick={handleOpenWaze}
                >
                  ABRIR NO WAZE
                </Button>

                {/* Botões Secundários */}
                {!arrivedAtPoint ? (
                  <div className="grid grid-cols-3 gap-3">
                    <Button 
                      variant="outline" 
                      className="py-6 font-bold rounded-2xl border-2"
                      onClick={handleNextPoint}
                    >
                      <SkipForward className="mr-1 h-4 w-4" />
                      PRÓXIMO
                    </Button>
                    <Button 
                      variant="secondary"
                      className="py-6 font-bold rounded-2xl"
                      onClick={handlePauseForRide}
                    >
                      <Pause className="mr-1 h-4 w-4" />
                      CORRIDA
                    </Button>
                    <Button 
                      variant="outline"
                      className="py-6 font-bold rounded-2xl border-2"
                      onClick={() => setShowCircuitList(true)}
                    >
                      <RefreshCw className="mr-1 h-4 w-4" />
                      TROCAR
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full py-7 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700"
                    onClick={handleNextPoint}
                  >
                    ✓ CHEGUEI NO PONTO
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Botão Recalcular */}
            <Button 
              variant="ghost" 
              className="w-full text-muted-foreground hover:text-primary rounded-2xl py-6 font-semibold"
              onClick={handleRecalculate}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              RECALCULAR REGIÃO (Caí em outra região)
            </Button>

            {/* Modo Caça */}
            <Button 
              className={`w-full py-6 font-bold rounded-2xl transition-all ${
                huntModeActive 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white'
              }`}
              onClick={() => setHuntModeActive(!huntModeActive)}
            >
              <Zap className="mr-2 h-4 w-4" />
              {huntModeActive ? "DESATIVAR MODO CAÇA" : "ATIVAR MODO CAÇA"}
            </Button>
          </div>
        )}

        {/* Modal de Circuitos Próximos */}
        {showCircuitList && (
          <div className="fixed inset-0 bg-black/50 flex items-end z-50">
            <div className="w-full bg-background rounded-t-3xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Circuitos Próximos</h2>
              <div className="space-y-3">
                {nearbyCircuits.map((item, idx) => (
                  <div 
                    key={item.circuito.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-muted/50 transition-all"
                  >
                    <div>
                      <p className="font-bold text-lg">{idx + 1}. {item.circuito.nome}</p>
                      <p className="text-sm text-muted-foreground">{formatDistance(item.distance)}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
              <Button 
                className="w-full mt-6 py-6 text-lg font-bold rounded-2xl bg-primary hover:bg-primary/90"
                onClick={() => {
                  if (nearbyCircuits[0]) {
                    handleStartCircuit(nearbyCircuits[0].circuito);
                  }
                }}
              >
                INICIAR CIRCUITO
              </Button>
              <Button 
                variant="ghost"
                className="w-full mt-2 py-6 font-semibold rounded-2xl"
                onClick={() => setShowCircuitList(false)}
              >
                CANCELAR
              </Button>
            </div>
          </div>
        )}

        {/* Circuito Finalizado */}
        {circuitCompleted && (
          <Card className="border-green-200 bg-green-50 dark:bg-green-950 shadow-lg rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-green-700 dark:text-green-200">Circuito Finalizado!</CardTitle>
              <CardDescription>Você completou todos os pontos do circuito {closestCircuito?.nome}.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full py-6 text-lg font-bold rounded-2xl bg-green-600 hover:bg-green-700"
                onClick={() => handleStartCircuit()}
              >
                REPETIR CIRCUITO
              </Button>
              <Button 
                variant="outline"
                className="w-full py-6 font-bold rounded-2xl border-2"
                onClick={() => setShowCircuitList(true)}
              >
                TROCAR CIRCUITO
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Circuito Pausado */}
        {isPaused && (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 shadow-lg rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-blue-700 dark:text-blue-200">Circuito Pausado</CardTitle>
              <CardDescription>Boa sorte na corrida! Retome o circuito quando terminar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full py-6 text-lg font-bold rounded-2xl bg-blue-600 hover:bg-blue-700"
                onClick={handleResume}
              >
                RETOMAR CIRCUITO
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dica do Especialista */}
        <div className="mt-8 rounded-2xl bg-muted/50 p-4 border border-border">
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Dica de Especialista
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Esses circuitos foram desenhados para manter você em movimento em áreas de alta demanda como hospitais, metrôs e polos comerciais. Se em 15 minutos não tocar corrida, considere trocar de circuito.
          </p>
        </div>
      </div>
    </Layout>
  );
}
