-- Habilitar RLS na tabela circuit_points
ALTER TABLE circuit_points ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura por qualquer usuário autenticado
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON circuit_points 
FOR SELECT 
TO authenticated 
USING (true);

-- Conceder permissões básicas para a role authenticated
GRANT SELECT ON circuit_points TO authenticated;
