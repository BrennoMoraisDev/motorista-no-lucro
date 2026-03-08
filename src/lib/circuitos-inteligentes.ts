// Tipos para o novo sistema de circuitos inteligentes
export interface CircuitPoint {
  id: string;
  circuito: string;
  nome_ponto: string;
  endereco: string;
  latitude: number;
  longitude: number;
  motivo: string;
  horario_pico: string;
  nivel_demanda: string;
  hora_inicio: string;
  hora_fim: string;
  dias_semana: string[];
}

export interface PointWithDistance extends CircuitPoint {
  distance_meters: number;
  duration_minutes: number;
  is_active: boolean;
}

// Verificar se um ponto está ativo no horário/dia atual
export function isPointActive(point: CircuitPoint): boolean {
  const now = new Date();
  const currentDay = getDayOfWeek(now);
  const currentTime = getTimeString(now);

  // Verificar se o dia da semana está na lista
  if (!point.dias_semana.includes(currentDay)) {
    return false;
  }

  // Verificar se está dentro do horário
  if (point.hora_inicio && point.hora_fim) {
    if (currentTime < point.hora_inicio || currentTime > point.hora_fim) {
      return false;
    }
  }

  return true;
}

// Obter dia da semana em português (seg, ter, qua, etc)
function getDayOfWeek(date: Date): string {
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return days[date.getDay()];
}

// Obter hora em formato HH:MM
function getTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Filtrar pontos ativos
export function filterActivePoints(points: CircuitPoint[]): CircuitPoint[] {
  return points.filter(isPointActive);
}

// Calcular distância em linha reta (Haversine formula) - para fallback
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Raio da Terra em metros
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distância em metros
}

// Formatar distância para exibição
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

// Formatar duração para exibição
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}min`;
}

// Verificar se motorista chegou ao ponto (menos de 150 metros)
export function hasArrivedAtPoint(
  currentLat: number,
  currentLon: number,
  pointLat: number,
  pointLon: number
): boolean {
  const distance = calculateDistance(currentLat, currentLon, pointLat, pointLon);
  return distance < 150; // 150 metros
}
