
CREATE TABLE public.circuit_points (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circuito text NOT NULL,
  nome_ponto text NOT NULL,
  endereco text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  motivo text NOT NULL DEFAULT '',
  horario_pico text NOT NULL DEFAULT '',
  nivel_demanda text NOT NULL DEFAULT 'medio',
  hora_inicio text NOT NULL DEFAULT '06:00',
  hora_fim text NOT NULL DEFAULT '23:00',
  dias_semana jsonb NOT NULL DEFAULT '["seg","ter","qua","qui","sex","sab","dom"]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.circuit_points ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read circuit points
CREATE POLICY "Authenticated users can read circuit points"
  ON public.circuit_points
  FOR SELECT
  TO authenticated
  USING (true);
