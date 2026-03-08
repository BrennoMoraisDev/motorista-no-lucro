import { useState, useCallback } from 'react';
import { CircuitPoint, PointWithDistance, calculateDistance, formatDistance, formatDuration } from '@/lib/circuitos-inteligentes';

// Usar OpenRouteService para calcular rotas reais
// Alternativa: Google Directions API, Mapbox Directions
const ORS_API_KEY = import.meta.env.VITE_ORS_API_KEY || '';

interface RouteResponse {
  routes: Array<{
    summary: {
      distance: number;
      duration: number;
    };
  }>;
}

export function useRouteCalculation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(
    async (
      startLat: number,
      startLon: number,
      endLat: number,
      endLon: number
    ): Promise<{ distance: number; duration: number } | null> => {
      try {
        setLoading(true);
        setError(null);

        // Se não houver chave de API, usar cálculo de distância em linha reta como fallback
        if (!ORS_API_KEY) {
          console.warn('⚠️ ORS_API_KEY não configurada. Usando cálculo de distância em linha reta.');
          const distance = calculateDistance(startLat, startLon, endLat, endLon);
          // Estimar tempo: aproximadamente 50 km/h em média em São Paulo
          const duration = (distance / 1000 / 50) * 60; // em minutos
          return { distance, duration };
        }

        // Usar OpenRouteService API
        const response = await fetch(
          `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${ORS_API_KEY}&start=${startLon},${startLat}&end=${endLon},${endLat}`
        );

        if (!response.ok) {
          throw new Error('Erro ao calcular rota');
        }

        const data: RouteResponse = await response.json();
        const route = data.routes[0];

        if (!route) {
          throw new Error('Nenhuma rota encontrada');
        }

        return {
          distance: route.summary.distance, // em metros
          duration: route.summary.duration / 60, // converter para minutos
        };
      } catch (err) {
        console.error('❌ Erro ao calcular rota:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const calculateRoutesForMultiplePoints = useCallback(
    async (
      startLat: number,
      startLon: number,
      points: CircuitPoint[]
    ): Promise<PointWithDistance[]> => {
      const pointsWithDistance: PointWithDistance[] = [];

      for (const point of points) {
        const route = await calculateRoute(startLat, startLon, point.latitude, point.longitude);

        if (route) {
          pointsWithDistance.push({
            ...point,
            distance_meters: route.distance,
            duration_minutes: route.duration,
            is_active: true,
          });
        } else {
          // Fallback: usar distância em linha reta
          const distance = calculateDistance(startLat, startLon, point.latitude, point.longitude);
          const duration = (distance / 1000 / 50) * 60;
          pointsWithDistance.push({
            ...point,
            distance_meters: distance,
            duration_minutes: duration,
            is_active: true,
          });
        }

        // Pequeno delay para não sobrecarregar a API
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Ordenar por tempo de chegada (menor primeiro)
      return pointsWithDistance.sort((a, b) => a.duration_minutes - b.duration_minutes);
    },
    [calculateRoute]
  );

  return {
    loading,
    error,
    calculateRoute,
    calculateRoutesForMultiplePoints,
  };
}
