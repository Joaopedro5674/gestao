-- Tabela interna para evitar hibernação do Supabase
-- Não interfere com dados do usuário
-- Executar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS system_health (
    id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    last_ping_at timestamptz DEFAULT now()
);

-- Ativar RLS
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública (para o frontend verificar se precisa acordar)
CREATE POLICY "Allow public read access" 
ON system_health FOR SELECT 
USING (true);

-- Permitir update apenas via Service Role (API Route / Cron)
-- Usuários autenticados ou anônimos NÃO podem alterar
CREATE POLICY "Allow service role update" 
ON system_health FOR ALL 
USING (auth.role() = 'service_role');

-- Inserir registro inicial se não existir
INSERT INTO system_health (id, last_ping_at)
SELECT '00000000-0000-0000-0000-000000000001', now()
WHERE NOT EXISTS (SELECT 1 FROM system_health);
