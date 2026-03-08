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
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4 pb-24">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">🧭 Circuitos Inteligentes</h1>
            <p className="text-gray-600">Sistema inteligente de pontos de corrida</p>
          </div>

          {/* Seleção de Circuito */}
          {circuits.length > 0 && (
            <Card className="mb-6 border-2 border-blue-200">
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
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <MapPin className="h-4 w-4 text-blue-600" />
                  <span>
                    Localização: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ponto Selecionado */}
          {selectedPoint && (
            <Card className="mb-6 border-2 border-green-300 shadow-lg">
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
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">Tempo de Chegada</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatDuration(selectedPoint.duration_minutes)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-600">Distância</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatDistance(selectedPoint.distance_meters)}
                    </p>
                  </div>
                </div>

                {/* Motivo */}
                {selectedPoint.motivo && (
                  <div className="rounded-lg bg-amber-50 p-3 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-900">Motivo da Parada</p>
                    <p className="text-sm text-amber-800">{selectedPoint.motivo}</p>
                  </div>
                )}

                {/* Horário de Pico */}
                {selectedPoint.horario_pico && (
                  <div className="flex items-center gap-2 rounded-lg bg-purple-50 p-3 border border-purple-200">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <div>
                      <p className="text-xs font-semibold text-purple-900">Horário de Pico</p>
                      <p className="text-sm text-purple-800">{selectedPoint.horario_pico}</p>
                    </div>
                  </div>
                )}

                {/* Nível de Demanda */}
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-semibold text-orange-700">
                    Demanda: {selectedPoint.nivel_demanda}
                  </span>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-3 pt-4">
                  {hasArrived ? (
                    <div className="rounded-lg bg-green-50 p-3 border border-green-300">
                      <p className="text-center font-bold text-green-700">✅ Ponto Alcançado!</p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToWaze(selectedPoint)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold rounded-lg"
                    >
                      🧭 IR PARA O PONTO
                    </Button>
                  )}

                  {hasArrived && (
                    <Button
                      onClick={handleNextPoint}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-bold rounded-lg"
                    >
                      ⏭ PRÓXIMO PONTO
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de Próximos Pontos */}
          {activePoints.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Próximos Pontos</CardTitle>
                <CardDescription>Ordenados por tempo de chegada</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activePoints.map((point, index) => (
                    <button
                      key={point.id}
                      onClick={() => setSelectedPoint(point)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                        selectedPoint?.id === point.id
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{index + 1}. {point.nome_ponto}</p>
                          <p className="text-sm text-gray-600">{point.motivo}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{formatDuration(point.duration_minutes)}</p>
                          <p className="text-xs text-gray-500">{formatDistance(point.distance_meters)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sem Pontos Ativos */}
          {selectedCircuit && activePoints.length === 0 && !routeLoading && (
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertCircle className="h-4 w-4 text-yellow-700" />
              <AlertDescription className="text-yellow-800">
                Nenhum ponto ativo neste horário/dia. Tente outro circuito.
              </AlertDescription>
            </Alert>
          )}

          {/* Carregando Rotas */}
          {routeLoading && (
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Calculando rotas...</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
