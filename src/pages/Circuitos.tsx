import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin, Clock, Navigation, CheckCircle2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CircuitPoint,
  PointWithDistance,
  filterActivePoints,
  formatDistance,
  formatDuration,
  hasArrivedAtPoint,
} from "@/lib/circuitos-inteligentes";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";

export default function Circuitos() {
  const { user } = useAuth();
  const [selectedCircuit, setSelectedCircuit] = useState<string | null>(null);
  const [allPoints, setAllPoints] = useState<CircuitPoint[]>([]);
  const [activePoints, setActivePoints] = useState<PointWithDistance[]>([]);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<PointWithDistance | null>(null);
  const [hasArrived, setHasArrived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const { calculateRoutesForMultiplePoints, loading: routeLoading } = useRouteCalculation();

  // Obter lista de circuitos disponíveis
  const circuits = Array.from(new Set(allPoints.map(p => p.circuito))).sort();

  // Carregar pontos do banco de dados
  useEffect(() => {
    const loadPoints = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("circuit_points")
          .select("*");

        if (error) throw error;
        setAllPoints(data || []);

        // Selecionar primeiro circuito por padrão
        if (data && data.length > 0) {
          const firstCircuit = data[0].circuito;
          setSelectedCircuit(firstCircuit);
        }
      } catch (err) {
        console.error("❌ Erro ao carregar pontos:", err);
        setError("Erro ao carregar circuitos");
      } finally {
        setLoading(false);
      }
    };

    loadPoints();
  }, []);

  // Obter localização atual do motorista
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não disponível");
      return;
    }

    // Obter localização inicial
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => {
        console.error("❌ Erro ao obter localização:", err);
        setError("Erro ao obter localização");
      }
    );

    // Monitorar localização em tempo real
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (err) => console.error("❌ Erro ao monitorar localização:", err)
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filtrar e ordenar pontos quando circuito ou localização mudar
  useEffect(() => {
    const updatePoints = async () => {
      if (!selectedCircuit || !currentLocation) return;

      try {
        // Filtrar pontos do circuito selecionado
        const circuitPoints = allPoints.filter(p => p.circuito === selectedCircuit);

        // Filtrar apenas pontos ativos no horário/dia atual
        const activeCircuitPoints = filterActivePoints(circuitPoints);

        if (activeCircuitPoints.length === 0) {
          setActivePoints([]);
          return;
        }

        // Calcular rotas reais para cada ponto
        const pointsWithRoutes = await calculateRoutesForMultiplePoints(
          currentLocation.lat,
          currentLocation.lon,
          activeCircuitPoints
        );

        setActivePoints(pointsWithRoutes);

        // Se não houver ponto selecionado, selecionar o mais próximo
        if (!selectedPoint && pointsWithRoutes.length > 0) {
          setSelectedPoint(pointsWithRoutes[0]);
        }
      } catch (err) {
        console.error("❌ Erro ao atualizar pontos:", err);
      }
    };

    updatePoints();
  }, [selectedCircuit, currentLocation, allPoints, calculateRoutesForMultiplePoints, selectedPoint]);

  // Verificar se chegou ao ponto selecionado
  useEffect(() => {
    if (!selectedPoint || !currentLocation) return;

    const arrived = hasArrivedAtPoint(
      currentLocation.lat,
      currentLocation.lon,
      selectedPoint.latitude,
      selectedPoint.longitude
    );

    setHasArrived(arrived);
  }, [selectedPoint, currentLocation]);

  // Navegar para o Waze (sem abrir nova aba)
  const handleNavigateToWaze = (point: PointWithDistance) => {
    const wazeUrl = `waze://?ll=${point.latitude},${point.longitude}&navigate=yes`;
    window.location.href = wazeUrl;
  };

  // Ir para próximo ponto
  const handleNextPoint = () => {
    if (!selectedPoint || activePoints.length === 0) return;

    const currentIndex = activePoints.findIndex(p => p.id === selectedPoint.id);
    const nextIndex = (currentIndex + 1) % activePoints.length;
    setSelectedPoint(activePoints[nextIndex]);
    setHasArrived(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[70vh] items-center justify-center flex-col gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Carregando circuitos inteligentes...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 pb-24 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">🧭 Circuitos Inteligentes</h1>
            <p className="text-gray-600 dark:text-slate-400">Sistema inteligente de pontos de corrida</p>
          </div>

          {/* Seleção de Circuito */}
          {circuits.length > 0 && (
            <Card className="mb-6 border-2 border-blue-200 dark:border-blue-900/30">
              <CardHeader>
                <CardTitle className="text-lg">Selecionar Circuito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {circuits.map(circuit => (
                    <Button
                      key={circuit}
                      onClick={() => {
                        setSelectedCircuit(circuit);
                        setSelectedPoint(null);
                        setHasArrived(false);
                      }}
                      variant={selectedCircuit === circuit ? "default" : "outline"}
                      className="w-full"
                    >
                      {circuit}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Erro */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Localização Atual */}
          {currentLocation && (
            <Card className="mb-6 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>
                    Localização: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ponto Selecionado */}
          {selectedPoint ? (
            <Card className="mb-6 border-2 border-green-300 shadow-lg dark:border-green-900/30">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedPoint.nome_ponto}</CardTitle>
                    <CardDescription>{selectedPoint.endereco}</CardDescription>
                  </div>
                  {hasArrived && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Informações do Ponto */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-3">
                    <p className="text-xs text-gray-600 dark:text-slate-400">Tempo de Chegada</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatDuration(selectedPoint.duration_minutes)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 dark:bg-slate-900 p-3">
                    <p className="text-xs text-gray-600 dark:text-slate-400">Distância</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {formatDistance(selectedPoint.distance_meters)}
                    </p>
                  </div>
                </div>

                {/* Motivo */}
                {selectedPoint.motivo && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900/30">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-400">Motivo da Parada</p>
                    <p className="text-sm text-amber-800 dark:text-amber-300">{selectedPoint.motivo}</p>
                  </div>
                )}

                {/* Horário de Pico */}
                {selectedPoint.horario_pico && (
                  <div className="flex items-center gap-2 rounded-lg bg-purple-50 dark:bg-purple-950/20 p-3 border border-purple-200 dark:border-purple-900/30">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-semibold text-purple-900 dark:text-purple-400">Horário de Pico</p>
                      <p className="text-sm text-purple-800 dark:text-purple-300">{selectedPoint.horario_pico}</p>
                    </div>
                  </div>
                )}

                {/* Nível de Demanda */}
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                    Demanda: {selectedPoint.nivel_demanda}
                  </span>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3 pt-4">
                  {hasArrived ? (
                    <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3 border border-green-300 dark:border-green-900/30">
                      <p className="text-center font-bold text-green-700 dark:text-green-400">✅ Ponto Alcançado!</p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToWaze(selectedPoint)}
                      className="w-full h-14 text-lg bg-[#33ccff] hover:bg-[#2bb5e0] text-white border-none"
                    >
                      <Navigation className="mr-2 h-5 w-5" />
                      Navegar com Waze
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleNextPoint}
                    variant="outline"
                    className="w-full h-12"
                  >
                    Próximo Ponto do Circuito
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed">
              <div className="flex flex-col items-center gap-4">
                <Navigation className="h-12 w-12 text-muted-foreground animate-pulse" />
                <div>
                  <h3 className="text-lg font-semibold">Nenhum ponto ativo</h3>
                  <p className="text-muted-foreground">
                    Não há pontos ativos para este circuito no momento ou sua localização ainda não foi obtida.
                  </p>
                </div>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            </Card>
          )}

          {/* Lista de outros pontos do circuito */}
          {activePoints.length > 1 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" /> Outros pontos próximos
              </h3>
              <div className="grid gap-3">
                {activePoints
                  .filter(p => p.id !== selectedPoint?.id)
                  .map(point => (
                    <Card
                      key={point.id}
                      className="cursor-pointer hover:border-blue-400 transition-colors"
                      onClick={() => {
                        setSelectedPoint(point);
                        setHasArrived(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{point.nome_ponto}</p>
                          <p className="text-xs text-muted-foreground">{point.endereco}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">{formatDistance(point.distance_meters)}</p>
                          <p className="text-[10px] text-muted-foreground">{formatDuration(point.duration_minutes)}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
