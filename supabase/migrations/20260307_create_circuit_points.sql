-- Criar tabela circuit_points com campos de horário e dia da semana
CREATE TABLE IF NOT EXISTS circuit_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuito TEXT NOT NULL,
  nome_ponto TEXT NOT NULL,
  endereco TEXT,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  motivo TEXT,
  horario_pico TEXT,
  nivel_demanda TEXT DEFAULT 'media',
  hora_inicio TIME,
  hora_fim TIME,
  dias_semana TEXT[] DEFAULT ARRAY['seg', 'ter', 'qua', 'qui', 'sex'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_circuit_points_circuito ON circuit_points(circuito);
CREATE INDEX IF NOT EXISTS idx_circuit_points_coords ON circuit_points(latitude, longitude);

-- Inserir dados iniciais dos circuitos inteligentes
INSERT INTO circuit_points (circuito, nome_ponto, endereco, latitude, longitude, motivo, horario_pico, nivel_demanda, hora_inicio, hora_fim, dias_semana) VALUES
-- Paulista
('Paulista', 'Shopping Cidade SP', 'Avenida Paulista, 901', -23.5615, -46.6560, 'Shopping + restaurantes', '11h - 14h', 'alta', '11:00', '14:30', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab']),
('Paulista', 'MASP', 'Avenida Paulista, 1578', -23.5606, -46.6561, 'Museu + turismo', '10h - 17h', 'media', '10:00', '17:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab']),
('Paulista', 'Parque Trianon', 'Avenida Paulista, 1000', -23.5620, -46.6565, 'Parque + lazer', '08h - 18h', 'media', '08:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),

-- Liberdade
('Liberdade', 'Rua 25 de Março', 'Rua 25 de Março, 500', -23.5560, -46.6390, 'Comércio + varejo', '09h - 18h', 'alta', '09:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab']),
('Liberdade', 'Praça da Liberdade', 'Praça da Liberdade, 1', -23.5550, -46.6380, 'Centro + eventos', '08h - 20h', 'media', '08:00', '20:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),
('Liberdade', 'Mercadão', 'Rua da Glória, 471', -23.5570, -46.6370, 'Mercado + alimentação', '06h - 20h', 'alta', '06:00', '20:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),

-- Centro
('Centro', 'Pátio do Colégio', 'Pátio do Colégio, 100', -23.5505, -46.6333, 'Centro histórico', '08h - 18h', 'media', '08:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),
('Centro', 'Largo São Bento', 'Largo São Bento, 1', -23.5480, -46.6340, 'Metrô + comércio', '07h - 20h', 'alta', '07:00', '20:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),
('Centro', 'Rua 15 de Novembro', 'Rua 15 de Novembro, 500', -23.5490, -46.6350, 'Comércio + bancos', '09h - 18h', 'media', '09:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),

-- Barra Funda
('Barra Funda', 'Terminal Barra Funda', 'Avenida Presidente Castelo Branco, 3000', -23.5050, -46.6620, 'Terminal + ônibus', '06h - 22h', 'alta', '06:00', '22:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),
('Barra Funda', 'Estação Barra Funda', 'Avenida Presidente Castelo Branco, 3100', -23.5055, -46.6625, 'Estação + metrô', '05h - 23h', 'alta', '05:00', '23:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),

-- Vila Olímpia
('Vila Olímpia', 'Shopping Vila Olímpia', 'Avenida Brigadeiro Faria Lima, 2000', -23.5945, -46.6890, 'Shopping + restaurantes', '10h - 22h', 'alta', '10:00', '22:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab']),
('Vila Olímpia', 'Parque Ibirapuera', 'Avenida Pedro Álvares Cabral, 1000', -23.5905, -46.6580, 'Parque + lazer', '08h - 18h', 'media', '08:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),

-- Itaim Bibi
('Itaim Bibi', 'Avenida Brigadeiro Faria Lima', 'Avenida Brigadeiro Faria Lima, 3000', -23.5950, -46.6950, 'Corporativo + restaurantes', '11h - 14h', 'alta', '11:00', '14:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),
('Itaim Bibi', 'Shopping Iguatemi', 'Avenida Brigadeiro Faria Lima, 2232', -23.5960, -46.6920, 'Shopping + moda', '10h - 22h', 'media', '10:00', '22:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab']),

-- Hospital das Clínicas
('Hospital das Clínicas', 'HC - Entrada Principal', 'Avenida Enéas Carvalho de Aguiar, 255', -23.5620, -46.7200, 'Hospital + urgência', '00h - 23h', 'alta', '00:00', '23:59', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']),
('Hospital das Clínicas', 'Faculdade de Medicina', 'Avenida Dr. Arnaldo, 455', -23.5630, -46.7210, 'Faculdade + pesquisa', '07h - 19h', 'media', '07:00', '19:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),

-- Pinheiros
('Pinheiros', 'Rua Bandeira', 'Rua Bandeira, 702', -23.5720, -46.7050, 'Comércio + serviços', '09h - 18h', 'media', '09:00', '18:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex']),
('Pinheiros', 'Avenida Pedroso de Moraes', 'Avenida Pedroso de Moraes, 1000', -23.5750, -46.7080, 'Residencial + comércio', '08h - 20h', 'media', '08:00', '20:00', ARRAY['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']);
