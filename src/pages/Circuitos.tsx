import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, MapPin, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
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

  const circuits = Array.from(new Set(allPoints.map(p => p.circuito))).sort();

  // Load points from DB
  useEffect(() => {
    const loadPoints = async () => {
      try {
        setLoading(true);
        const { data, error: fetchErr } = await supabase
          .from("circuit_points")
          .select("*");

        if (fetchErr) throw fetchErr;

        // Map DB rows to CircuitPoint interface
        const points: CircuitPoint[] = (data || []).map((row: any) => ({
          id: row.id,
          circuito: row.circuito,
          nome_ponto: row.nome_ponto,
          endereco: row.endereco,
          latitude: row.latitude,
          longitude: row.longitude,
          motivo: row.motivo,
          horario_pico: row.horario_pico,
          nivel_demanda: row.nivel_demanda,
          hora_inicio: row.hora_inicio,
          hora_fim: row.hora_fim,
          dias_semana: Array.isArray(row.dias_semana) ? row.dias_semana : JSON.parse(row.dias_semana || '[]'),
        }));

        setAllPoints(points);
        if (points.length > 0) {
          setSelectedCircuit(points[0].circuito);
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

  // Get current location
  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalização não disponível");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      (err) => {
        console.error("❌ Erro ao obter localização:", err);
        setError("Erro ao obter localização. Permita o acesso à localização.");
      }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentLocation({ lat: position.coords.latitude, lon: position.coords.longitude });
      },
      (err) => console.error("❌ Erro ao monitorar localização:", err)
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Filter and sort points when circuit or location changes
  const updatePoints = useCallback(async () => {
    if (!selectedCircuit || !currentLocation) return;

    try {
      const circuitPoints = allPoints.filter(p => p.circuito === selectedCircuit);
      const activeCircuitPoints = filterActivePoints(circuitPoints);

      if (activeCircuitPoints.length === 0) {
        setActivePoints([]);
        return;
      }

      const pointsWithRoutes = await calculateRoutesForMultiplePoints(
        currentLocation.lat,
        currentLocation.lon,
        activeCircuitPoints
      );

      setActivePoints(pointsWithRoutes);

      if (!selectedPoint && pointsWithRoutes.length > 0) {
        setSelectedPoint(pointsWithRoutes[0]);
      }
    } catch (err) {
      console.error("❌ Erro ao atualizar pontos:", err);
    }
  }, [selectedCircuit, currentLocation, allPoints, calculateRoutesForMultiplePoints, selectedPoint]);

  useEffect(() => {
    updatePoints();
  }, [selectedCircuit, currentLocation?.lat, currentLocation?.lon, allPoints]);

  // Check arrival
  useEffect(() => {
    if (!selectedPoint || !currentLocation) return;
    const arrived = hasArrivedAtPoint(
      currentLocation.lat, currentLocation.lon,
      selectedPoint.latitude, selectedPoint.longitude
    );
    setHasArrived(arrived);
  }, [selectedPoint, currentLocation]);

  const handleNavigateToWaze = (point: PointWithDistance) => {
    const wazeUrl = `waze://?ll=${point.latitude},${point.longitude}&navigate=yes`;
    window.location.href = wazeUrl;
  };

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
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">🧭 Circuitos Inteligentes</h1>
            <p className="text-muted-foreground">Sistema inteligente de pontos de corrida</p>
          </div>

          {/* Circuit selector */}
          {circuits.length > 0 && (
            <Card className="mb-6 border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg">Selecionar Circuito</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                  {circuits.map(circuit => (
                    <Button
                      key={circuit}
                      onClick={() => {
                        setSelectedCircuit(circuit);
                        setSelectedPoint(null);
                        setHasArrived(false);
                      }}
                      variant={selectedCircuit === circuit ? "default" : "outline"}
                      className="w-full text-sm"
                    >
                      {circuit}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {currentLocation && (
            <Card className="mb-6 bg-muted/50 border-border">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>
                    Localização: {currentLocation.lat.toFixed(4)}, {currentLocation.lon.toFixed(4)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected point */}
          {selectedPoint && (
            <Card className="mb-6 border-2 border-primary/30 shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{selectedPoint.nome_ponto}</CardTitle>
                    <CardDescription>{selectedPoint.endereco}</CardDescription>
                  </div>
                  {hasArrived && <CheckCircle2 className="h-6 w-6 text-primary" />}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Tempo de Chegada</p>
                    <p className="text-lg font-bold text-primary">{formatDuration(selectedPoint.duration_minutes)}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xs text-muted-foreground">Distância</p>
                    <p className="text-lg font-bold text-primary">{formatDistance(selectedPoint.distance_meters)}</p>
                  </div>
                </div>

                {selectedPoint.motivo && (
                  <div className="rounded-lg bg-accent/50 p-3 border border-accent">
                    <p className="text-xs font-semibold text-accent-foreground">Motivo da Parada</p>
                    <p className="text-sm text-accent-foreground">{selectedPoint.motivo}</p>
                  </div>
                )}

                {selectedPoint.horario_pico && (
                  <div className="flex items-center gap-2 rounded-lg bg-muted p-3 border border-border">
                    <Clock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Horário de Pico</p>
                      <p className="text-sm text-muted-foreground">{selectedPoint.horario_pico}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">
                    Demanda: {selectedPoint.nivel_demanda}
                  </span>
                </div>

                <div className="space-y-3 pt-4">
                  {hasArrived ? (
                    <div className="rounded-lg bg-primary/10 p-3 border border-primary/30">
                      <p className="text-center font-bold text-primary">✅ Ponto Alcançado!</p>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleNavigateToWaze(selectedPoint)}
                      className="w-full py-6 text-lg font-bold rounded-lg"
                    >
                      🧭 IR PARA O PONTO
                    </Button>
                  )}

                  {hasArrived && (
                    <Button
                      onClick={handleNextPoint}
                      variant="secondary"
                      className="w-full py-6 text-lg font-bold rounded-lg"
                    >
                      ⏭ PRÓXIMO PONTO
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next points list */}
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
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{index + 1}. {point.nome_ponto}</p>
                          <p className="text-sm text-muted-foreground">{point.motivo}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">{formatDuration(point.duration_minutes)}</p>
                          <p className="text-xs text-muted-foreground">{formatDistance(point.distance_meters)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedCircuit && activePoints.length === 0 && !routeLoading && (
            <Alert className="bg-muted border-border">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Nenhum ponto ativo neste horário/dia. Tente outro circuito.
              </AlertDescription>
            </Alert>
          )}

          {routeLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Calculando rotas...</span>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
